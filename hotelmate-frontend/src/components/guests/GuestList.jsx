import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/services/api';

const GuestList = () => {
  const { hotelIdentifier } = useParams(); // Comes from route like /:hotelIdentifier/guests
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hotelIdentifier) {
      setError('Missing hotel identifier in URL.');
      setLoading(false);
      return;
    }

    async function fetchGuests() {
      try {
        const res = await api.get(`/guests/${hotelIdentifier}/guests/`);
        setGuests(res.data.results);

      } catch (err) {
        setError('Failed to load guests.');
      } finally {
        setLoading(false);
      }
    }

    fetchGuests();
  }, [hotelIdentifier]);

  if (loading) return <p>Loading guests...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div className="container py-4">
      <h3>Guests at {hotelIdentifier}</h3>
      {guests.length === 0 ? (
        <p>No guests assigned yet.</p>
      ) : (
        <ul className="list-group">
          {guests.map((guest) => (
            <li key={guest.id} className="list-group-item">
              {guest.first_name} {guest.last_name} | Room {guest.room_number}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GuestList;
