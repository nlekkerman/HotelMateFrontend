import { useState, useEffect } from 'react';
import { memoryGameAPI } from '@/services/memoryGameAPI';
import TournamentCreator from './TournamentCreator';

export default function TournamentList({ onTournamentSelect }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showTournamentCreator, setShowTournamentCreator] = useState(false);

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        setLoading(true);
        const data = await memoryGameAPI.getTournaments('active');
        setTournaments(data || []);
        setError(null);
      } catch (error) {
        console.error('Failed to load tournaments:', error);
        setError('Failed to load tournaments');
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadTournaments();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (tournament) => {
    const now = new Date();
    const startDate = new Date(tournament.start_date);
    const endDate = new Date(tournament.end_date);
    const registrationDeadline = new Date(tournament.registration_deadline);

    if (now > endDate) {
      return <span className="badge bg-secondary">Completed</span>;
    } else if (now >= startDate && now <= endDate) {
      return <span className="badge bg-success">Active</span>;
    } else if (now < registrationDeadline) {
      return <span className="badge bg-primary">Registration Open</span>;
    } else {
      return <span className="badge bg-warning text-dark">Registration Closed</span>;
    }
  };

  const isRegistrationOpen = (tournament) => {
    const now = new Date();
    const registrationDeadline = new Date(tournament.registration_deadline);
    return now < registrationDeadline && tournament.participant_count < tournament.max_participants;
  };

  const handleRegister = (tournament) => {
    setSelectedTournament(tournament);
    setShowRegistration(true);
  };

  const handleRegistrationSubmit = async (participantData) => {
    try {
      await memoryGameAPI.registerForTournament(selectedTournament.id, participantData);
      alert(`Successfully registered for ${selectedTournament.name}!`);
      setShowRegistration(false);
      setSelectedTournament(null);
      
      // Refresh tournaments to update participant count
      const updatedTournaments = await memoryGameAPI.getTournaments('active');
      setTournaments(updatedTournaments || []);
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleTournamentCreated = async (tournament) => {
    // Refresh tournaments to include the new one
    const updatedTournaments = await memoryGameAPI.getTournaments('active');
    setTournaments(updatedTournaments || []);
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">🏆 Memory Match Tournaments</h2>
        <button
          className="btn btn-success"
          onClick={() => setShowTournamentCreator(true)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Create Tournament
        </button>
      </div>

      {error && (
        <div className="alert alert-warning text-center" role="alert">
          {error}
        </div>
      )}

      {tournaments.length === 0 && !loading && !error && (
        <div className="text-center">
          <div className="alert alert-info" role="alert">
            <h4>No Active Tournaments</h4>
            <p>Check back later for upcoming tournaments!</p>
          </div>
        </div>
      )}

      <div className="row g-4">
        {tournaments.map((tournament) => (
          <div key={tournament.id} className="col-12 col-md-6 col-lg-4">
            <TournamentCard 
              tournament={tournament}
              onRegister={handleRegister}
              onSelect={onTournamentSelect}
              isRegistrationOpen={isRegistrationOpen(tournament)}
              statusBadge={getStatusBadge(tournament)}
              formatDate={formatDate}
            />
          </div>
        ))}
      </div>

      {/* Registration Modal */}
      {showRegistration && selectedTournament && (
        <TournamentRegistration 
          tournament={selectedTournament}
          onSubmit={handleRegistrationSubmit}
          onClose={() => {
            setShowRegistration(false);
            setSelectedTournament(null);
          }}
        />
      )}

      {/* Tournament Creator Modal */}
      {showTournamentCreator && (
        <TournamentCreator
          onTournamentCreated={handleTournamentCreated}
          onClose={() => setShowTournamentCreator(false)}
        />
      )}
    </div>
  );
}

const TournamentCard = ({ tournament, onRegister, onSelect, isRegistrationOpen, statusBadge, formatDate }) => {
  const progressPercentage = Math.min(
    (tournament.participant_count / tournament.max_participants) * 100,
    100
  );

  return (
    <div className="card h-100 shadow-sm">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">{tournament.name}</h5>
        {statusBadge}
      </div>
      
      <div className="card-body">
        <p className="card-text text-muted">{tournament.description}</p>
        
        <div className="mb-3">
          <div className="row text-center">
            <div className="col-6">
              <strong>Difficulty</strong>
              <div className="text-primary">{tournament.difficulty_display}</div>
            </div>
            <div className="col-6">
              <strong>Age Range</strong>
              <div className="text-info">{tournament.min_age}-{tournament.max_age} years</div>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <strong>Participants</strong>
          <div className="progress mt-1">
            <div 
              className="progress-bar bg-success" 
              role="progressbar" 
              style={{width: `${progressPercentage}%`}}
              aria-valuenow={tournament.participant_count}
              aria-valuemin="0" 
              aria-valuemax={tournament.max_participants}
            >
              {tournament.participant_count}/{tournament.max_participants}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="row">
            <div className="col-6">
              <strong>Starts</strong>
              <div className="small text-muted">{formatDate(tournament.start_date)}</div>
            </div>
            <div className="col-6">
              <strong>Ends</strong>
              <div className="small text-muted">{formatDate(tournament.end_date)}</div>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <strong>Prizes</strong>
          <div className="row mt-2">
            <div className="col-12">
              <div className="small">
                🥇 {tournament.first_prize}<br/>
                🥈 {tournament.second_prize}<br/>
                🥉 {tournament.third_prize}
              </div>
            </div>
          </div>
        </div>

        {tournament.rules && (
          <div className="mb-3">
            <strong>Rules</strong>
            <div className="small text-muted">{tournament.rules}</div>
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="d-grid gap-2">
          {isRegistrationOpen ? (
            <button 
              className="btn btn-primary"
              onClick={() => onRegister(tournament)}
            >
              Register Now
            </button>
          ) : (
            <button className="btn btn-secondary" disabled>
              Registration Closed
            </button>
          )}
          
          <button 
            className="btn btn-outline-info btn-sm"
            onClick={() => onSelect(tournament.id)}
          >
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};

const TournamentRegistration = ({ tournament, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    participant_name: '',
    participant_age: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate age
    const age = parseInt(formData.participant_age);
    if (age < tournament.min_age || age > tournament.max_age) {
      alert(`Age must be between ${tournament.min_age} and ${tournament.max_age} years old for this tournament.`);
      return;
    }

    if (!formData.participant_name.trim()) {
      alert('Please enter participant name.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Register for {tournament.name}</h5>
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
              <div className="mb-3">
                <label htmlFor="participant_name" className="form-label">Participant Name *</label>
                <input
                  type="text"
                  className="form-control"
                  id="participant_name"
                  value={formData.participant_name}
                  onChange={(e) => setFormData({...formData, participant_name: e.target.value})}
                  required
                  disabled={submitting}
                  placeholder="Enter full name"
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="participant_age" className="form-label">Age *</label>
                <input
                  type="number"
                  className="form-control"
                  id="participant_age"
                  min={tournament.min_age}
                  max={tournament.max_age}
                  value={formData.participant_age}
                  onChange={(e) => setFormData({...formData, participant_age: e.target.value})}
                  required
                  disabled={submitting}
                  placeholder={`Age (${tournament.min_age}-${tournament.max_age})`}
                />
                <div className="form-text">
                  Must be between {tournament.min_age} and {tournament.max_age} years old
                </div>
              </div>

              <div className="alert alert-info">
                <h6>Tournament Details:</h6>
                <ul className="mb-0">
                  <li>Difficulty: {tournament.difficulty_display}</li>
                  <li>Duration: {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}</li>
                  <li>Current participants: {tournament.participant_count}/{tournament.max_participants}</li>
                  {tournament.rules && <li>Rules: {tournament.rules}</li>}
                </ul>
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
                    Registering...
                  </>
                ) : (
                  'Register'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};