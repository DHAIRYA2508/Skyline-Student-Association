# Architecture Documentation

## Overview

The Student Organization Management System is built as a decoupled multi-tier web application designed to support the operations of student associations.

## Components

1. **Frontend**: ReactJS (TypeScript, Vite, React Router DOM, Axios, Lucide React)
2. **Backend**: FastAPI (Python 3.10+, SQLAlchemy 2.0, Pydantic v2, PyMySQL)
3. **Database**: MySQL 8+ (InnoDB engine)

## Data Flow

```text
[ React Frontend ]  <---> REST API (JSON / JWT) <--->  [ FastAPI Backend ]  <---> SQLAlchemy 2.0 <---> [ MySQL Database ]
```
