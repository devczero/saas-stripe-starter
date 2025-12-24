'use client'

import { useState, useEffect } from 'react'
import { Trash2, Edit, Plus, X, Check, RefreshCw } from 'lucide-react'

type Record = {
  id: string
  title: string
  description: string | null
  status: string
  userId: string
  createdAt: string
  updatedAt: string
}

export default function CrudTest() {
  const [records, setRecords] = useState<Record[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'active'
  })

  // Fetch all records
  const fetchRecords = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/test-records')
      if (!response.ok) {
        throw new Error('Failed to fetch records')
      }
      const data = await response.json()
      setRecords(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  // Create record
  const handleCreate = async () => {
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/test-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create record')
      }

      const newRecord = await response.json()
      setRecords([newRecord, ...records])
      setFormData({ title: '', description: '', status: 'active' })
      setIsCreating(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Update record
  const handleUpdate = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/test-records/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update record')
      }

      const updatedRecord = await response.json()
      setRecords(records.map(r => r.id === id ? updatedRecord : r))
      setEditingId(null)
      setFormData({ title: '', description: '', status: 'active' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Delete record
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/test-records/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete record')
      }

      setRecords(records.filter(r => r.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Start editing
  const startEdit = (record: Record) => {
    setEditingId(record.id)
    setFormData({
      title: record.title,
      description: record.description || '',
      status: record.status
    })
    setIsCreating(false)
  }

  // Cancel editing/creating
  const cancelEdit = () => {
    setEditingId(null)
    setIsCreating(false)
    setFormData({ title: '', description: '', status: 'active' })
    setError(null)
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="bg-[#18181a] rounded-2xl border border-[#2f2f2f] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#2f2f2f]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">CRUD Test Dashboard</h2>
              <p className="text-gray-400 text-sm mt-1">
                Test Create, Read, Update, Delete operations with multi-tenant isolation
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchRecords}
                disabled={loading}
                className="px-4 py-2 bg-[#232328] hover:bg-[#23232e] text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              {!isCreating && !editingId && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Record
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Create Form */}
        {isCreating && (
          <div className="p-6 border-b border-[#2f2f2f] bg-[#232328]">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Record</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Title *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="px-4 py-2 bg-[#18181a] border border-[#2f2f2f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="px-4 py-2 bg-[#18181a] border border-[#2f2f2f] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="px-4 py-2 bg-[#18181a] border border-[#2f2f2f] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Create
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 bg-[#232328] hover:bg-[#2f2f2f] text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#232328]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232328]">
              {records.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No records found. Create your first record to test CRUD operations.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-[#232328] transition-colors">
                    {editingId === record.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-1 bg-[#18181a] border border-[#2f2f2f] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-1 bg-[#18181a] border border-[#2f2f2f] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-3 py-1 bg-[#18181a] border border-[#2f2f2f] rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="pending">Pending</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(record.id)}
                              disabled={loading}
                              className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                              title="Save"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-gray-400 hover:text-gray-300"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm font-medium text-white">
                          {record.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {record.description || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            record.status === 'inactive' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(record)}
                              disabled={loading || isCreating}
                              className="p-1 text-blue-400 hover:text-blue-300 disabled:opacity-50"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              disabled={loading}
                              className="p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Stats Footer */}
        <div className="p-4 border-t border-[#2f2f2f] bg-[#232328]">
          <p className="text-sm text-gray-400">
            Total Records: <span className="text-white font-semibold">{records.length}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
