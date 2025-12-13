import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/api";

function RoomDetails() {
  const { hotelIdentifier, roomNumber, id } = useParams();

  console.log("Hotel Identifier:", hotelIdentifier);
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQRCodes, setShowQRCodes] = useState(false);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        const response = await api.get(
          `/rooms/${hotelIdentifier}/rooms/${roomNumber}/`
        );

        setRoom(response.data);
      } catch (err) {
        setError("Failed to fetch room details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomDetails();
  }, [id]);

  if (loading)
    return <p className="text-center mt-4">Loading room details...</p>;
  if (error) return <p className="text-center text-danger mt-4">{error}</p>;
  if (!room) return null;

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h1 className="display-6 mb-0 text-dark fw-bold">
                <i className="bi bi-door-open me-3 text-primary"></i>
                Room {room.room_number}
              </h1>
              <p className="text-muted mb-0">Detailed room information and services</p>
            </div>
            <div className={`badge fs-6 px-3 py-2 ${room.is_occupied ? 'bg-danger' : 'bg-success'}`}>
              <i className={`bi ${room.is_occupied ? 'bi-person-fill' : 'bi-house'} me-2`}></i>
              {room.is_occupied ? 'Occupied' : 'Available'}
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Room Information Card */}
        <div className="col-12 mb-4">
          <div className="card border-0 shadow-lg">
            <div className="card-header main-bg text-white py-3">
              <h4 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Room Information
              </h4>
            </div>
            <div className="card-body p-4">
              {/* Room Number */}
              <div className="mb-4">
                <label className="form-label text-muted fw-semibold mb-2">Room Number</label>
                <div className="p-3 bg-light rounded-3 border-start border-primary border-4">
                  <h5 className="mb-0 text-primary fw-bold">#{room.room_number}</h5>
                </div>
              </div>

              {/* Guest PIN */}
              <div className="mb-4">
                <label className="form-label text-muted fw-semibold mb-2">Guest PIN</label>
                <div className="p-3 bg-light rounded-3 border-start border-warning border-4">
                  {room.guest_id_pin ? (
                    <h5 className="mb-0 text-warning fw-bold">{room.guest_id_pin}</h5>
                  ) : (
                    <span className="text-secondary fst-italic">Not assigned</span>
                  )}
                </div>
              </div>

              {/* QR Codes Button */}
              <div className="mb-4">
                <button 
                  className="btn btn-outline-primary btn-sm w-100"
                  onClick={() => setShowQRCodes(true)}
                >
                  <i className="bi bi-qr-code me-2"></i>
                  View QR Codes
                </button>
              </div>

              {/* Guests */}
              <div>
                <label className="form-label text-muted fw-semibold mb-2">
                  <i className="bi bi-people me-2"></i>
                  Current Guests
                </label>
                <div className="p-3 bg-light rounded-3 border-start border-info border-4">
                  {room.guests_in_room && room.guests_in_room.length > 0 ? (
                    <div className="d-flex flex-column gap-2">
                      {room.guests_in_room.map((guest) => (
                        <div key={guest.id} className="d-flex align-items-center p-2 bg-white rounded-2 border">
                          <div className="me-3">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                              <i className="bi bi-person-fill"></i>
                            </div>
                          </div>
                          <div>
                            <h6 className="mb-0 fw-semibold">{guest.first_name} {guest.last_name}</h6>
                            <small className="text-muted">Guest</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-secondary fst-italic">No guests assigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* QR Codes Modal */}
      {showQRCodes && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header main-bg text-white">
                <h4 className="modal-title mb-0">
                  <i className="bi bi-qr-code me-2"></i>
                  QR Code Services
                </h4>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowQRCodes(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-4">
                  {room.room_service_qr_code && (
                    <div className="col-12 col-md-6">
                      <div className="card border-0 bg-light h-100">
                        <div className="card-body text-center p-4">
                          <div className="mb-3">
                            <i className="bi bi-house-door text-primary" style={{fontSize: '2rem'}}></i>
                          </div>
                          <h6 className="card-title fw-semibold mb-3">Room Service</h6>
                          <div className="qr-container mb-3">
                            <img
                              src={room.room_service_qr_code}
                              alt="Room Service QR Code"
                              className="img-fluid rounded-3 shadow-sm"
                              style={{ width: 150, height: 150, objectFit: "contain" }}
                            />
                          </div>
                          <p className="text-muted small mb-0">Scan to order room service</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {room.in_room_breakfast_qr_code && (
                    <div className="col-12 col-md-6">
                      <div className="card border-0 bg-light h-100">
                        <div className="card-body text-center p-4">
                          <div className="mb-3">
                            <i className="bi bi-cup-hot text-warning" style={{fontSize: '2rem'}}></i>
                          </div>
                          <h6 className="card-title fw-semibold mb-3">In-Room Breakfast</h6>
                          <div className="qr-container mb-3">
                            <img
                              src={room.in_room_breakfast_qr_code}
                              alt="In-Room Breakfast QR Code"
                              className="img-fluid rounded-3 shadow-sm"
                              style={{ width: 150, height: 150, objectFit: "contain" }}
                            />
                          </div>
                          <p className="text-muted small mb-0">Scan to order breakfast</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {room.dinner_booking_qr_code && (
                    <div className="col-12 col-md-6">
                      <div className="card border-0 bg-light h-100">
                        <div className="card-body text-center p-4">
                          <div className="mb-3">
                            <i className="bi bi-house text-success" style={{fontSize: '2rem'}}></i>
                          </div>
                          <h6 className="card-title fw-semibold mb-3">Restaurant Booking</h6>
                          <div className="qr-container mb-3">
                            <img
                              src={room.dinner_booking_qr_code}
                              alt="Dinner Booking QR Code"
                              className="img-fluid rounded-3 shadow-sm"
                              style={{ width: 150, height: 150, objectFit: "contain" }}
                            />
                          </div>
                          <p className="text-muted small mb-0">Scan to book dinner</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {room.chat_pin_qr_code && (
                    <div className="col-12 col-md-6">
                      <div className="card border-0 bg-light h-100">
                        <div className="card-body text-center p-4">
                          <div className="mb-3">
                            <i className="bi bi-chat-dots text-info" style={{fontSize: '2rem'}}></i>
                          </div>
                          <h6 className="card-title fw-semibold mb-3">Guest Chat</h6>
                          <div className="qr-container mb-3">
                            <img
                              src={room.chat_pin_qr_code}
                              alt="Chat QR Code"
                              className="img-fluid rounded-3 shadow-sm"
                              style={{ width: 150, height: 150, objectFit: "contain" }}
                            />
                          </div>
                          <p className="text-muted small mb-0">Scan to start chatting</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* No QR Codes Message */}
                {!room.room_service_qr_code && !room.in_room_breakfast_qr_code && 
                 !room.dinner_booking_qr_code && !room.chat_pin_qr_code && (
                  <div className="text-center py-5">
                    <i className="bi bi-qr-code text-muted" style={{fontSize: '4rem'}}></i>
                    <h5 className="text-muted mt-3">No QR codes available</h5>
                    <p className="text-muted">QR codes will appear here when they are generated for this room.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-lg">
            <div className="card-body p-4">
              <div className="d-flex flex-column flex-md-row gap-3 justify-content-center">
                <button
                  className="btn btn-outline-secondary btn-lg px-4"
                  onClick={() => navigate("/rooms")}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Rooms List
                </button>
                
                {!room.is_occupied && (
                  <button
                    className="btn main-bg text-white btn-lg px-4"
                    onClick={() => navigate(`/rooms/${room.room_number}/add-guest`)}
                  >
                    <i className="bi bi-person-plus me-2"></i>
                    Assign Guest
                  </button>
                )}
                
                {room.is_occupied && (
                  <button
                    className="btn btn-warning btn-lg px-4"
                  >
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Check Out Guest
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomDetails;
