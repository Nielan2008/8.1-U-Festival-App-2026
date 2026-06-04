import React, { useEffect, useState } from 'react';
import '../cms.css';

// CMS editor for GPS anchor points (coordinate mapping from real-world GPS to SVG pixel space).
// Allows setting 2+ anchor points that define how GPS coordinates map to the map SVG canvas.
export default function AnchorsEditor() {
  const [anchors, setAnchors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', lat: '', lng: '', svg_x: '', svg_y: '' });

  useEffect(() => {
    loadAnchors();
  }, []);

  const loadAnchors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/map-anchors', { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load anchors: ${res.status}`);
      const data = await res.json();
      setAnchors(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load anchors');
      setAnchors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lat || !formData.lng || !formData.svg_x || !formData.svg_y) {
      setError('All GPS and SVG coordinates are required');
      return;
    }

    const payload = {
      name: formData.name || `Anchor ${new Date().toLocaleString()}`,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng),
      svg_x: parseInt(formData.svg_x, 10),
      svg_y: parseInt(formData.svg_y, 10)
    };

    try {
      let res;
      if (editingId) {
        res = await fetch(`/api/map-anchors/${editingId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/map-anchors', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) throw new Error(`Failed to save anchor: ${res.status}`);
      setFormData({ name: '', lat: '', lng: '', svg_x: '', svg_y: '' });
      setEditingId(null);
      await loadAnchors();
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to save anchor');
    }
  };

  const handleEdit = (anchor) => {
    setEditingId(anchor.id);
    setFormData({
      name: anchor.name || '',
      lat: String(anchor.lat),
      lng: String(anchor.lng),
      svg_x: String(anchor.svg_x),
      svg_y: String(anchor.svg_y)
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this anchor point?')) return;
    try {
      const res = await fetch(`/api/map-anchors/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`Failed to delete anchor: ${res.status}`);
      await loadAnchors();
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to delete anchor');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', lat: '', lng: '', svg_x: '', svg_y: '' });
  };

  if (loading) return <div className="cms-container"><p>Loading anchors…</p></div>;

  return (
    <div className="cms-container">
      <h2>GPS Anchor Points</h2>
      <p className="cms-help">Define 2 or more reference points mapping real-world GPS coordinates to SVG pixel positions. The map system uses these anchors to position the user's GPS location correctly on the festival map.</p>

      {error && <div className="message error">{error}</div>}

      <form onSubmit={handleSubmit} className="cms-form">
        <div className="form-row">
          <label htmlFor="name">Name (optional):</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Festival Entrance"
          />
        </div>

        <div className="form-row">
          <label htmlFor="lat">GPS Latitude (decimal):</label>
          <input
            id="lat"
            type="number"
            step="0.000001"
            value={formData.lat}
            onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
            placeholder="e.g., 52.0620"
            required
          />
        </div>

        <div className="form-row">
          <label htmlFor="lng">GPS Longitude (decimal):</label>
          <input
            id="lng"
            type="number"
            step="0.000001"
            value={formData.lng}
            onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
            placeholder="e.g., 5.1390"
            required
          />
        </div>

        <div className="form-row">
          <label htmlFor="svg_x">SVG X Pixel Position:</label>
          <input
            id="svg_x"
            type="number"
            value={formData.svg_x}
            onChange={(e) => setFormData({ ...formData, svg_x: e.target.value })}
            placeholder="e.g., 120"
            required
          />
        </div>

        <div className="form-row">
          <label htmlFor="svg_y">SVG Y Pixel Position:</label>
          <input
            id="svg_y"
            type="number"
            value={formData.svg_y}
            onChange={(e) => setFormData({ ...formData, svg_y: e.target.value })}
            placeholder="e.g., 340"
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="button">{editingId ? 'Update Anchor' : 'Add Anchor'}</button>
          {editingId && <button type="button" className="button secondary" onClick={handleCancel}>Cancel</button>}
        </div>
      </form>

      <h3>Existing Anchors ({anchors.length})</h3>
      {anchors.length === 0 ? (
        <p className="cms-help">No anchor points yet. Add at least 2 to enable GPS positioning.</p>
      ) : (
        <table className="cms-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>SVG X</th>
              <th>SVG Y</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {anchors.map((anchor) => (
              <tr key={anchor.id}>
                <td>{anchor.name || '(unnamed)'}</td>
                <td>{Number(anchor.lat).toFixed(6)}</td>
                <td>{Number(anchor.lng).toFixed(6)}</td>
                <td>{anchor.svg_x}</td>
                <td>{anchor.svg_y}</td>
                <td>
                  <button className="cms-action-btn" onClick={() => handleEdit(anchor)}>Edit</button>
                  <button className="cms-action-btn danger" onClick={() => handleDelete(anchor.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
