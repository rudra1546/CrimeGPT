from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.task import InvestigationTask
from app.models.case import Case
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.routes.deps import RoleChecker, get_current_user
from app.models.user import User
from app.utils.audit_helper import log_audit

router = APIRouter(dependencies=[Depends(RoleChecker(["ADMIN", "POLICE_OFFICER", "SHO", "LEGAL_ADVISOR"]))])

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter(Case.id == task_data.case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {task_data.case_id} not found."
        )
        
    db_task = InvestigationTask(**task_data.model_dump())
    db.add(db_task)
    
    # Add CaseTimeline event
    from app.models.timeline import CaseTimeline
    db_timeline = CaseTimeline(
        case_id=task_data.case_id,
        event_name="Task Created",
        description=f"Investigation task '{db_task.title}' was scheduled and assigned to {db_task.assigned_to or 'Unassigned'}.",
        created_by=current_user.id
    )
    db.add(db_timeline)
    
    db.commit()
    db.refresh(db_task)
    
    # Audit log
    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Add Task",
        details=f"Created task '{db_task.title}' (Status: {db_task.status}, Assigned to: {db_task.assigned_to}) on Case FIR No. {case.fir_number}"
    )
    
    return db_task

@router.get("/case/{case_id}", response_model=list[TaskResponse])
def get_case_tasks(case_id: int, db: Session = Depends(get_db)):
    return db.query(InvestigationTask).filter(InvestigationTask.case_id == case_id).all()

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(InvestigationTask).filter(InvestigationTask.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found."
        )
        
    case = db.query(Case).filter(Case.id == task.case_id).first()
    fir_no = case.fir_number if case else "N/A"
    
    update_dict = task_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(task, key, value)
        
    db.commit()
    db.refresh(task)
    
    # Audit log
    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Update Task",
        details=f"Updated task '{task.title}' (Status: {task.status}) on Case FIR No. {fir_no}"
    )
    
    return task

@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(InvestigationTask).filter(InvestigationTask.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found."
        )
        
    case = db.query(Case).filter(Case.id == task.case_id).first()
    fir_no = case.fir_number if case else "N/A"
    title = task.title
    
    db.delete(task)
    db.commit()
    
    # Audit log
    log_audit(
        db,
        user_id=current_user.id,
        user_name=current_user.name,
        action="Delete Task",
        details=f"Deleted task '{title}' from Case FIR No. {fir_no}"
    )
    
    return {"message": f"Task '{title}' deleted successfully."}
