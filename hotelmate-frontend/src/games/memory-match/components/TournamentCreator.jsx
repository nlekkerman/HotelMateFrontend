import { useState } from 'react';
import { memoryGameAPI } from '@/services/memoryGameAPI';

export default function TournamentCreator({ onTournamentCreated, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    difficulty: 'intermediate', // Default to tournament standard
    min_age: 8,
    max_age: 99,
    max_participants: 50,
    start_date: '',
    end_date: '',
    registration_deadline: '',
    first_prize: '',
    second_prize: '',
    third_prize: '',
    rules: '',
    is_public: true,
    entry_fee: 0
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Set default dates (tournament starts tomorrow, ends in 7 days, registration deadline today + 1 day)
  useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const regDeadline = new Date();
    regDeadline.setDate(regDeadline.getDate() + 1);
    regDeadline.setHours(23, 59, 0, 0);

    setFormData(prev => ({
      ...prev,
      start_date: tomorrow.toISOString().slice(0, 16),
      end_date: nextWeek.toISOString().slice(0, 16),
      registration_deadline: regDeadline.toISOString().slice(0, 16)
    }));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.name.trim()) newErrors.name = 'Tournament name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.first_prize.trim()) newErrors.first_prize = 'First prize is required';
    if (!formData.second_prize.trim()) newErrors.second_prize = 'Second prize is required';
    if (!formData.third_prize.trim()) newErrors.third_prize = 'Third prize is required';
    
    // Date validation
    const now = new Date();
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const regDeadline = new Date(formData.registration_deadline);
    
    if (regDeadline <= now) {
      newErrors.registration_deadline = 'Registration deadline must be in the future';
    }
    if (startDate <= regDeadline) {
      newErrors.start_date = 'Start date must be after registration deadline';
    }
    if (endDate <= startDate) {
      newErrors.end_date = 'End date must be after start date';
    }
    
    // Age validation
    if (formData.min_age < 1) newErrors.min_age = 'Minimum age must be at least 1';
    if (formData.max_age <= formData.min_age) {
      newErrors.max_age = 'Maximum age must be greater than minimum age';
    }
    
    // Participants validation
    if (formData.max_participants < 2) {
      newErrors.max_participants = 'Must allow at least 2 participants';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    
    try {
      const tournament = await memoryGameAPI.createTournament(formData);
      alert(`Tournament "${tournament.name}" created successfully! Tournament ID: ${tournament.id}`);
      onTournamentCreated(tournament);
      onClose();
    } catch (error) {
      console.error('Failed to create tournament:', error);
      const errorMessage = error.response?.data?.error || 
                         error.response?.data?.message || 
                         error.message || 
                         'Failed to create tournament';
      alert('Error creating tournament: ' + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyLabel = (difficulty) => {
    const labels = {
      easy: 'Easy (2x4 Grid)',
      intermediate: 'Tournament Standard (3x4 Grid)', 
      hard: 'Hard (4x4 Grid)'
    };
    return labels[difficulty];
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">🏆 Create New Tournament</h5>
            <button 
              type="button" 
              className="btn-close" 
              aria-label="Close"
              onClick={onClose}
              disabled={submitting}
            ></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                {/* Basic Information */}
                <div className="col-12">
                  <h6 className="text-primary mb-3">📋 Basic Information</h6>
                </div>
                
                <div className="col-12 mb-3">
                  <label htmlFor="name" className="form-label">Tournament Name *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                    placeholder="e.g. Summer Memory Championship 2024"
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>
                
                <div className="col-12 mb-3">
                  <label htmlFor="description" className="form-label">Description *</label>
                  <textarea
                    className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                    id="description"
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                    placeholder="Describe the tournament, its goals, and any special features..."
                  ></textarea>
                  {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                </div>

                {/* Game Settings */}
                <div className="col-12 mt-4">
                  <h6 className="text-primary mb-3">🎮 Game Settings</h6>
                </div>
                
                <div className="col-12 col-md-6 mb-3">
                  <label htmlFor="difficulty" className="form-label">Difficulty Level</label>
                  <select
                    className="form-select"
                    id="difficulty"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    disabled={submitting}
                  >
                    <option value="easy">Easy (2x4 Grid) - 4 pairs</option>
                    <option value="intermediate">Tournament Standard (3x4 Grid) - 6 pairs</option>
                    <option value="hard">Hard (4x4 Grid) - 8 pairs</option>
                  </select>
                  <div className="form-text">Selected: {getDifficultyLabel(formData.difficulty)}</div>
                </div>

                {/* Participant Settings */}
                <div className="col-12 mt-4">
                  <h6 className="text-primary mb-3">👥 Participant Settings</h6>
                </div>
                
                <div className="col-6 col-md-4 mb-3">
                  <label htmlFor="min_age" className="form-label">Min Age</label>
                  <input
                    type="number"
                    className={`form-control ${errors.min_age ? 'is-invalid' : ''}`}
                    id="min_age"
                    name="min_age"
                    min="1"
                    max="99"
                    value={formData.min_age}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                  {errors.min_age && <div className="invalid-feedback">{errors.min_age}</div>}
                </div>
                
                <div className="col-6 col-md-4 mb-3">
                  <label htmlFor="max_age" className="form-label">Max Age</label>
                  <input
                    type="number"
                    className={`form-control ${errors.max_age ? 'is-invalid' : ''}`}
                    id="max_age"
                    name="max_age"
                    min="1"
                    max="99"
                    value={formData.max_age}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                  {errors.max_age && <div className="invalid-feedback">{errors.max_age}</div>}
                </div>
                
                <div className="col-12 col-md-4 mb-3">
                  <label htmlFor="max_participants" className="form-label">Max Participants</label>
                  <input
                    type="number"
                    className={`form-control ${errors.max_participants ? 'is-invalid' : ''}`}
                    id="max_participants"
                    name="max_participants"
                    min="2"
                    max="1000"
                    value={formData.max_participants}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                  {errors.max_participants && <div className="invalid-feedback">{errors.max_participants}</div>}
                </div>

                {/* Schedule */}
                <div className="col-12 mt-4">
                  <h6 className="text-primary mb-3">📅 Schedule</h6>
                </div>
                
                <div className="col-12 col-md-4 mb-3">
                  <label htmlFor="registration_deadline" className="form-label">Registration Deadline *</label>
                  <input
                    type="datetime-local"
                    className={`form-control ${errors.registration_deadline ? 'is-invalid' : ''}`}
                    id="registration_deadline"
                    name="registration_deadline"
                    value={formData.registration_deadline}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  />
                  {errors.registration_deadline && <div className="invalid-feedback">{errors.registration_deadline}</div>}
                </div>
                
                <div className="col-12 col-md-4 mb-3">
                  <label htmlFor="start_date" className="form-label">Tournament Start *</label>
                  <input
                    type="datetime-local"
                    className={`form-control ${errors.start_date ? 'is-invalid' : ''}`}
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  />
                  {errors.start_date && <div className="invalid-feedback">{errors.start_date}</div>}
                </div>
                
                <div className="col-12 col-md-4 mb-3">
                  <label htmlFor="end_date" className="form-label">Tournament End *</label>
                  <input
                    type="datetime-local"
                    className={`form-control ${errors.end_date ? 'is-invalid' : ''}`}
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  />
                  {errors.end_date && <div className="invalid-feedback">{errors.end_date}</div>}
                </div>

                {/* Prizes */}
                <div className="col-12 mt-4">
                  <h6 className="text-primary mb-3">🏅 Prizes</h6>
                </div>
                
                <div className="col-12 col-md-4 mb-3">
                  <label htmlFor="first_prize" className="form-label">🥇 First Prize *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.first_prize ? 'is-invalid' : ''}`}
                    id="first_prize"
                    name="first_prize"
                    value={formData.first_prize}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                    placeholder="e.g. $500 Cash Prize"
                  />
                  {errors.first_prize && <div className="invalid-feedback">{errors.first_prize}</div>}
                </div>
                
                <div className="col-12 col-md-4 mb-3">
                  <label htmlFor="second_prize" className="form-label">🥈 Second Prize *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.second_prize ? 'is-invalid' : ''}`}
                    id="second_prize"
                    name="second_prize"
                    value={formData.second_prize}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                    placeholder="e.g. $200 Cash Prize"
                  />
                  {errors.second_prize && <div className="invalid-feedback">{errors.second_prize}</div>}
                </div>
                
                <div className="col-12 col-md-4 mb-3">
                  <label htmlFor="third_prize" className="form-label">🥉 Third Prize *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.third_prize ? 'is-invalid' : ''}`}
                    id="third_prize"
                    name="third_prize"
                    value={formData.third_prize}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                    placeholder="e.g. $100 Cash Prize"
                  />
                  {errors.third_prize && <div className="invalid-feedback">{errors.third_prize}</div>}
                </div>

                {/* Additional Settings */}
                <div className="col-12 mt-4">
                  <h6 className="text-primary mb-3">⚙️ Additional Settings</h6>
                </div>
                
                <div className="col-12 mb-3">
                  <label htmlFor="rules" className="form-label">Tournament Rules</label>
                  <textarea
                    className="form-control"
                    id="rules"
                    name="rules"
                    rows="3"
                    value={formData.rules}
                    onChange={handleChange}
                    disabled={submitting}
                    placeholder="Special rules or guidelines for this tournament..."
                  ></textarea>
                  <div className="form-text">Optional: Add any specific rules or guidelines</div>
                </div>
                
                <div className="col-12 col-md-6 mb-3">
                  <label htmlFor="entry_fee" className="form-label">Entry Fee ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    id="entry_fee"
                    name="entry_fee"
                    min="0"
                    step="0.01"
                    value={formData.entry_fee}
                    onChange={handleChange}
                    disabled={submitting}
                    placeholder="0.00"
                  />
                  <div className="form-text">Set to 0 for free tournaments</div>
                </div>
                
                <div className="col-12 col-md-6 mb-3 d-flex align-items-end">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="is_public"
                      name="is_public"
                      checked={formData.is_public}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                    <label className="form-check-label" htmlFor="is_public">
                      Public Tournament
                    </label>
                    <div className="form-text">Allow anyone to find and join this tournament</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creating Tournament...
                  </>
                ) : (
                  'Create Tournament'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}