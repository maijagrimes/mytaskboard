import { useState, useEffect, useMemo, useRef } from 'react'
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react'
import supabase from './supabaseClient'
import './index.css'

function Draggable({ id, children }) {
    const { isDragging, ref } = useDraggable({ id })
    return (
        <div ref={ref} className={`task-card ${isDragging ? 'dragging' : ''}`}>
        {children}
        </div>
    )
}

function Droppable({ id, children }) {
    const { isDropTarget, ref } = useDroppable({ id })
    return (
        <div ref={ref} className={`column ${isDropTarget ? 'drop-target' : ''}`}>
        <h3>{id}</h3>
        {children}
        </div>
    )
}

function EditTaskForm({ task, columns, onTaskUpdated, onCancel }) {
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
            console.error('Failed to update task:', error)
            return
        }

        onTaskUpdated(data)
    }

    return (
        <form onSubmit={handleSubmit} className="task-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                <button type="submit">Save</button>
                <button type="button" onClick={onCancel}>Cancel</button>
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

function NewTaskForm({ userId, columns, onTaskCreated, onCancel }) {
    const [formData, setFormData] = useState({
        title: '',
        status: '',
        due_date: '',
        description: '',
    })

    const handleChange = (field) => (event) => {
        setFormData((prev) => ({ ...prev, [field]: event.target.value }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (!formData.title.trim()) return

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

        if (error) {
            console.error('Failed to add task:', error)
            return
        }

        onTaskCreated(data)
        setFormData({ title: '', status: '', due_date: '', description: '' })
    }

    return (
        <form onSubmit={handleSubmit} style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
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
                <button type="submit">Add Task</button>
                <button type="button" onClick={onCancel}>Cancel</button>
            </div>
        </form>
    )
}

function Taskboard({ userId }) {
    const columns = ['To Do', 'In Progress', 'In Review', 'Done']
    const [tasks, setTasks] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [editingTask, setEditingTask] = useState(null)

    // Fetch this user's tasks on mount
    useEffect(() => {
        supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .then(({ data, error }) => {
            if (error) console.error(error)
            else setTasks(data)
        })
    }, [userId])

    const handleTaskCreated = (newTask) => {
        setTasks((prev) => [...prev, newTask])
        setShowForm(false)
    }

    const handleDeleteTask = async (taskId) => {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)

        if (error) {
            console.error('Failed to delete task:', error)
            return
        }

        setTasks((prev) => prev.filter((t) => t.id !== taskId))
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

        if (error) console.error('Failed to update task:', error)
    }

    return (
    <>
        <DragDropProvider onDragEnd={handleDragEnd}>
            <div className='column-box'>
                {columns.map((col) => (
                    <Droppable key={col} id={col}>
                    {tasks
                    .filter((t) => t.status === col)
                    .map((t) => 
                        editingTask?.id === t.id ? (
                            <EditTaskForm
                                key={t.id}
                                task={t}
                                columns={columns}
                                onTaskUpdated={handleTaskUpdated}
                                onCancel={() => setEditingTask(null)}
                            />
                        ) : (
                        <Draggable key={t.id} id={t.id}>
                            <div className="task-title">{t.title}</div>
                            {t.description && <div className="task-description">{t.description}</div>}
                            <div className="task-actions">
                                <button onClick={() => setEditingTask(t)}>✏️</button>
                                <button onClick={() => handleDeleteTask(t.id)}>🗑️</button>
                            </div>
                        </Draggable>
                    ))}
                </Droppable>
                ))}
            </div>
        </DragDropProvider>

        {showForm ? (
            <NewTaskForm
                userId={userId}
                columns={columns}
                onTaskCreated={handleTaskCreated}
                onCancel={() => setShowForm(false)}
            />
        ) : (
            <button className='new-task-button' onClick={() => setShowForm(true)}>New Task</button>
        )}
    </>
    )
}

export default function Home({ claims, onLogout }) {
    return (
        <>
            <div className='main'><Taskboard userId={claims.sub} /></div>
            
    </>
    )
}