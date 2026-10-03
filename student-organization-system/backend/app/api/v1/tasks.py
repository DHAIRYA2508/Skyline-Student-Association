from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import Ctx, current_ctx, get_or_404, require
from app.models.member import Member
from app.models.volunteer import Fundraiser, Task, TaskAssignment, VolunteerProfile
from app.schemas.requests import AssignIn, TaskIn, TaskUpdate
from app.services import audit
from app.utils.common import iso, naive, new_id, now, s

router = APIRouter(prefix="/tasks", tags=["Tasks"])
STATUSES = ("TODO", "IN_PROGRESS", "DONE", "BLOCKED")


def task_out(db, t: Task) -> dict:
    assignees = []
    for a in db.query(TaskAssignment).filter(TaskAssignment.task_id == s(t.id)).all():
        v = db.query(VolunteerProfile).filter(VolunteerProfile.id == s(a.volunteer_id)).first()
        m = db.query(Member).filter(Member.id == s(v.member_id)).first() if v else None
        assignees.append({"assignment_id": s(a.id), "volunteer_id": s(a.volunteer_id),
                          "name": f"{m.first_name} {m.last_name}" if m else "", "completed_at": iso(a.completed_at)})
    f = db.query(Fundraiser).filter(Fundraiser.id == s(t.fundraiser_id)).first() if t.fundraiser_id else None
    return {"id": s(t.id), "title": t.title, "description": t.description, "priority": t.priority, "status": t.status,
            "due_date": iso(t.due_date), "fundraiser_id": s(t.fundraiser_id), "fundraiser_name": f.name if f else None,
            "assignees": assignees}


def _assign(db, ctx, task: Task, volunteer_id: str):
    v = get_or_404(db, VolunteerProfile, volunteer_id, ctx.org_id)
    if db.query(TaskAssignment).filter(TaskAssignment.task_id == s(task.id), TaskAssignment.volunteer_id == s(v.id)).first():
        return
    db.add(TaskAssignment(id=new_id(), task_id=s(task.id), volunteer_id=s(v.id), assigned_by=s(ctx.user.id)))


@router.get("")
def list_tasks(fundraiser_id: str = "", mine: bool = False, status: str = "", ctx: Ctx = Depends(current_ctx)):
    q = ctx.db.query(Task).filter(Task.organization_id == ctx.org_id)
    manager = ctx.can("tasks.manage") or ctx.can("volunteers.manage")
    if fundraiser_id:
        q = q.filter(Task.fundraiser_id == fundraiser_id)
    if status:
        q = q.filter(Task.status == status.upper())
    rows = q.order_by(Task.created_at.desc()).all()
    out = [task_out(ctx.db, t) for t in rows]
    if mine or not manager:
        me = ctx.db.query(VolunteerProfile).filter(VolunteerProfile.member_id == s(ctx.member.id)).first() if ctx.member else None
        out = [t for t in out if me and any(a["volunteer_id"] == s(me.id) for a in t["assignees"])]
    return out


@router.post("", status_code=201)
def create(body: TaskIn, ctx: Ctx = Depends(require("tasks.manage"))):
    if body.fundraiser_id:
        get_or_404(ctx.db, Fundraiser, body.fundraiser_id, ctx.org_id)
    t = Task(id=new_id(), organization_id=ctx.org_id, created_by=s(ctx.user.id), title=body.title, description=body.description,
             priority=body.priority.upper(), due_date=naive(body.due_date), fundraiser_id=body.fundraiser_id, event_id=body.event_id)
    ctx.db.add(t)
    ctx.db.flush()
    for vid in body.volunteer_ids:
        _assign(ctx.db, ctx, t, vid)
    audit.log(ctx.db, ctx, "TASK_CREATED", "Task", t.id, new=body.model_dump(mode="json"))
    ctx.db.commit()
    return task_out(ctx.db, t)


@router.post("/{task_id}/assign")
def assign(task_id: str, body: AssignIn, ctx: Ctx = Depends(require("tasks.manage"))):
    t = get_or_404(ctx.db, Task, task_id, ctx.org_id)
    _assign(ctx.db, ctx, t, body.volunteer_id)
    audit.log(ctx.db, ctx, "TASK_ASSIGNED", "Task", t.id, new={"volunteer_id": body.volunteer_id})
    ctx.db.commit()
    return task_out(ctx.db, t)


@router.patch("/{task_id}")
def update(task_id: str, body: TaskUpdate, ctx: Ctx = Depends(current_ctx)):
    t = get_or_404(ctx.db, Task, task_id, ctx.org_id)
    manager = ctx.can("tasks.manage")
    me = ctx.db.query(VolunteerProfile).filter(VolunteerProfile.member_id == s(ctx.member.id)).first() if ctx.member else None
    mine = me and ctx.db.query(TaskAssignment).filter(TaskAssignment.task_id == s(t.id), TaskAssignment.volunteer_id == s(me.id)).first()
    if not manager and not mine:
        raise HTTPException(403, "You can only update tasks assigned to you")
    data = body.model_dump(exclude_none=True)
    if not manager:
        data = {k: v for k, v in data.items() if k == "status"}  # volunteers may only report progress
    if "status" in data:
        data["status"] = data["status"].upper()
        if data["status"] not in STATUSES:
            raise HTTPException(400, f"status must be one of {STATUSES}")
    old = t.status
    for k, v in data.items():
        setattr(t, k, naive(v) if k == "due_date" else v)
    if data.get("status") == "DONE":
        for a in ctx.db.query(TaskAssignment).filter(TaskAssignment.task_id == s(t.id)).all():
            a.completed_at = a.completed_at or now()
    audit.log(ctx.db, ctx, "TASK_UPDATED", "Task", t.id, old={"status": old}, new=data)
    ctx.db.commit()
    return task_out(ctx.db, t)
