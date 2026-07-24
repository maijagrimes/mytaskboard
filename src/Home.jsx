import { useState, useEffect, useMemo, useRef } from 'react'
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react'
import supabase from './supabaseClient'
import './index.css'

function TaskCard({ task, onClick }) {
    const { isDragging, ref } = useDraggable({ id: task.id })

    let dueLabel = null
    if (task.due_date) {
        if (isOverdue(task.due_date)) dueLabel = 'Overdue'
        else if (isDueSoon(task.due_date)) dueLabel = 'Due soon'
        else dueLabel = new Date(task.due_date).toLocaleDateString()
    }

    return (
        <div
            ref={ref}
            className={`task-card ${isDragging ? 'dragging' : ''}`}
            onClick={onClick}
        >
            <div className="task-title">{task.title}</div>
            {dueLabel && (
                <div className={`task-due-tag ${isOverdue(task.due_date) ? 'overdue' : isDueSoon(task.due_date) ? 'due-soon' : ''}`}>
                    {dueLabel}
                </div>
            )}
        </div>
    )
}

function Droppable({ id, children, color, onColorChange  }) {
    const { isDropTarget, ref } = useDroppable({ id })
    return (
        <div 
            ref={ref} 
            className="column"
            style={{ boxShadow: isDropTarget ? `0 0 7px 7px ${color}` : 'none', }}
        >
        <div className="column-header">
            <input
                type="color"
                className="column-color-dot"
                value={color}
                onChange={(e) => onColorChange(id, e.target.value)}
            />
            <h3>{id}</h3>
        </div>
        {children}
        </div>
    )
}

function isOverdue(dueDate) {
    if (!dueDate) return false
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
    return due < today
}

function isDueSoon(dueDate) {
    if (!dueDate) return false
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate); due.setHours(0, 0, 0, 0)
    const diffDays = (due - today) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 2
}

function EditTaskForm({ task, columns, onTaskUpdated, onCancel, onDelete }) {
    const [formData, setFormData] = useState({
        title: task.title,
        status: task.status,
        due_date: task.due_date,
        description: task.description || '',
    })

    const handleChange = (field) => (event) => {
        setFormData((prev) => ({ ...prev, [field]: event.target.value }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (!formData.title.trim()) return

        const { data, error } = await supabase
            .from('tasks')
            .update({
                title: formData.title,
                status: formData.status,
                due_date: formData.due_date || null,
                description: formData.description,
            })
            .eq('id', task.id)
            .select()
            .single()

        if (error) {
            setErrorMessage('Failed to update task. Please try again.')
            console.error('Failed to update task:', error)
            return
        }

        onTaskUpdated(data)
    }

    return (
        <form onSubmit={handleSubmit} className="task-card">
            <input
                type="text"
                className='task-title-input'
                value={formData.title}
                required
                onChange={handleChange('title')}
            />
            <select className='task-select-text' value={formData.status} onChange={handleChange('status')}>
                {columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                ))}
            </select>
            <input 
                type="date"
                className='task-date-input'
                value={formData.due_date}
                onChange={handleChange('due_date')}
            />
            <textarea
                className='task-description-input'
                value={formData.description}
                onChange={handleChange('description')}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit">Save</button>
                    <button type="button" onClick={onCancel}>Cancel</button>
                </div>
                <button type="button" onClick={() => onDelete(task.id)}>🗑️</button>
            </div>
        </form>
    )
}

const avatarModules = import.meta.glob('/src/assets/footer-icons/*.{png,jpg,jpeg,svg}', {
    eager: true,
    import: 'default',
})

const AVATAR_FILES = Object.values(avatarModules)

function pickAvatar(userId) {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
        hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
    }
    const index = hash % AVATAR_FILES.length
    return AVATAR_FILES[index]
}

export function ProfileMenu({ claims, onLogout }) {
    const [open, setOpen] = useState(false)
    const menuRef = useRef(null)
    const isLoggedIn = !!claims
    const avatarSrc = useMemo(() => { 
        if (!claims) return null
        return pickAvatar(claims.sub)
    }, [claims])

    // Close the dropdown when clicking outside it
    useEffect(() => {
        const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="profile-menu" ref={menuRef}>
        <button
            className="profile-avatar-button"
            onClick={() => isLoggedIn && setOpen((prev) => !prev)}
        >
            {isLoggedIn ? (
            <img src={avatarSrc} alt="Profile" className="profile-avatar-img" />
            ) : (
            <div className="profile-avatar-placeholder" />
            )}
        </button>

        {open && isLoggedIn && (
            <div className="profile-dropdown">
            <p>Welcome!</p>
            <p>You are logged in as: {claims.email}</p>
            <button onClick={onLogout}>Sign Out</button>
            </div>
        )}
        </div>
    )
}

function NewTaskForm({ userId, columns, defaultStatus, onTaskCreated, onCancel }) {
    const [formData, setFormData] = useState({
        title: '',
        status: defaultStatus || '',
        due_date: '',
        description: '',
    })

    const handleChange = (field) => (event) => {
        setFormData((prev) => ({ ...prev, [field]: event.target.value }))
    }

    const [saving, setSaving] = useState(false)

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (!formData.title.trim()) return
        setSaving(true)

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                title: formData.title,
                status: formData.status,
                due_date: formData.due_date || null,
                description: formData.description,
                user_id: userId,
            })
            .select()
            .single()

        setSaving(false)

        if (error) {
            setErrorMessage('Failed to add task. Please try again.')
            console.error('Failed to add task:', error)
            return
        }

        onTaskCreated(data)
    }

    return (
        <form onSubmit={handleSubmit} className='task-card'>
            <input
                type="text"
                className='task-title-input'
                placeholder="Task title"
                value={formData.title}
                required
                onChange={handleChange('title')}
            />
            <select className='task-select-text' value={formData.status} required onChange={handleChange('status')}>
                <option value="" disabled>Status</option>
                {columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                ))}
            </select>
            <input 
                type="date"
                className='task-date-input'
                value={formData.due_date}
                onChange={handleChange('due_date')}
            />
            <textarea
                className="task-description-input"
                placeholder="Description"
                value={formData.description}
                onChange={handleChange('description')}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <button type="submit" disabled={saving}>
                    {saving ? 'Adding…' : 'Add Task'}
                </button>
                <button type="button" onClick={onCancel}>Cancel</button>
            </div>
        </form>
    )
}

const DEFAULT_COLUMN_COLORS = {
    'To Do': '#f4756a',
    'In Progress': '#f06fd2',
    'In Review': '#5893f1',
    'Done': '#65da78',
}

function Column({
    id, color, onColorChange, tasks,
    editingTaskId, onTaskClick, onTaskUpdated, onTaskDeleted, onCancelEdit,
    columns, userId, isAdding, onStartAdd, onCancelAdd, onTaskCreated,
}) {
    const { isDropTarget, ref } = useDroppable({ id })

    return (
        <div ref={ref} className="column" style={{ boxShadow: isDropTarget ? `0 0 7px 7px ${color}` : 'none' }}>
            <div className="column-header">
                <input
                    type="color"
                    className="column-color-dot"
                    value={color}
                    onChange={(e) => onColorChange(id, e.target.value)}
                />
                <h3>{id}</h3>
            </div>

            <div className="column-tasklist">
                {tasks.map((t) =>
                    editingTaskId === t.id ? (
                        <EditTaskForm
                            key={t.id}
                            task={t}
                            columns={columns}
                            onTaskUpdated={onTaskUpdated}
                            onCancel={onCancelEdit}
                            onDelete={onTaskDeleted}
                        />
                    ) : (
                        <TaskCard key={t.id} task={t} onClick={() => onTaskClick(t)} />
                    )
                )}
            </div>

            {isAdding ? (
                <NewTaskForm
                    userId={userId}
                    columns={columns}
                    defaultStatus={id}
                    onTaskCreated={onTaskCreated}
                    onCancel={onCancelAdd}
                />
            ) : (
                <button className="column-add-button" onClick={onStartAdd}>+ Add Task</button>
            )}
        </div>
    )
}

function Taskboard({ userId }) {
    const columns = ['To Do', 'In Progress', 'In Review', 'Done']
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [addingToColumn, setAddingToColumn] = useState(null)
    const [editingTask, setEditingTask] = useState(null)
    const [columnColors, setColumnColors] = useState(DEFAULT_COLUMN_COLORS)
    const [errorMessage, setErrorMessage] = useState(null)

    // Fetch this user's tasks on mount
    useEffect(() => {
        setLoading(true)
        setLoadError(null)
        supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .then(({ data, error }) => {
            if (error) { 
                setLoadError(error.message)
                console.error(error) 
            }
            else { setTasks(data) }
            setLoading(false)
        })
    }, [userId])

    const handleColorChange = (columnName, newColor) => {
        setColumnColors((prev) => ({ ...prev, [columnName]: newColor }))
    }

    const handleTaskCreated = (newTask) => {
        setTasks((prev) => [...prev, newTask])
        setAddingToColumn(null)
    }

    const handleDeleteTask = async (taskId) => {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)

        if (error) {
            setErrorMessage('Failed to delete task. Please try again.')
            console.error('Failed to delete task:', error)
            return
        }

        setTasks((prev) => prev.filter((t) => t.id !== taskId))
        setEditingTask(null)
    }

    const handleTaskUpdated = (updatedTask) => {
        setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
        setEditingTask(null)
    }

    const handleDragEnd = async (event) => {
        if (event.canceled) return
        const taskId = event.operation.source?.id
        const newStatus = event.operation.target?.id
        if (!taskId || !newStatus) return

        // Update local state immediately so it feels responsive
        setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        )

        // Persist to Supabase
        const { error } = await supabase
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', taskId)

        if (error) { 
            setErrorMessage('Failed to update task. Please try again.')
            console.error('Failed to update task:', error)
        }
    }

    if (loading) {
        return <div className="board-status">Loading your tasks…</div>
    }

    if (loadError) {
        return (
            <div className="board-status board-error">
                <p>Couldn't load your tasks: {loadError}</p>
                <button onClick={() => window.location.reload()}>Try again</button>
            </div>
        )
    }

    return (
        <DragDropProvider onDragEnd={handleDragEnd}>
            <div className="column-box">
                {columns.map((col) => (
                    <Column
                        key={col}
                        id={col}
                        color={columnColors[col]}
                        onColorChange={handleColorChange}
                        tasks={tasks.filter((t) => t.status === col)}
                        editingTaskId={editingTask?.id}
                        onTaskClick={(t) => setEditingTask(t)}
                        onTaskUpdated={handleTaskUpdated}
                        onTaskDeleted={handleDeleteTask}
                        onCancelEdit={() => setEditingTask(null)}
                        columns={columns}
                        userId={userId}
                        isAdding={addingToColumn === col}
                        onStartAdd={() => setAddingToColumn(col)}
                        onCancelAdd={() => setAddingToColumn(null)}
                        onTaskCreated={handleTaskCreated}
                    />
                ))}
            </div>
        </DragDropProvider>
    )
}

export default function Home({ claims, onLogout }) {
    return (
        <>
            <div className='main'><Taskboard userId={claims.sub} /></div>
            
    </>
    )
}