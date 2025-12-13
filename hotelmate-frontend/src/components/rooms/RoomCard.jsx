import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RoomQr from "./RoomQr";
import { useSingleRoomQrPdfPrinter } from "@/components/rooms/hooks/useSingleRoomQrPdfPrinter";

const RoomCard = ({ room, selectedRooms, onSelect }) => {
  const navigate = useNavigate();
  const [qrType, setQrType] = useState("");
  const [isHovering, setIsHovering] = useState(false);
  const { generateSingleRoomQrPdf } = useSingleRoomQrPdfPrinter();

  const handleQrChange = (e) => setQrType(e.target.value);

  const qrEntries = Object.entries(room).filter(
    ([key, value]) => key.endsWith("_qr_code") && value
  );

  const formatQrName = (key) =>
    key
      .replace(/_qr_code$/, "")
      .replace(/_pin$/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const qrMap = qrEntries.reduce((acc, [key, value]) => {
    acc[formatQrName(key)] = value;
    return acc;
  }, {});

  const calculateStayDuration = (checkInDate) => {
    if (!checkInDate) return 'Unknown';
    const checkIn = new Date(checkInDate);
    const now = new Date();
    const diffTime = Math.abs(now - checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  return (
    <div className="col">
      <div 
        className="card h-100 shadow-sm position-relative"
        style={{ cursor: "pointer" }}
        onClick={() => navigate(`/rooms/${room.hotel_slug}/rooms/${room.room_number}`)}
      >
        {/* Hover Overlay for Occupied Rooms */}
        {room.is_occupied && isHovering && (
          <div 
            className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center main-bg"
            style={{
              zIndex: 10,
              borderRadius: 'inherit',
              pointerEvents: 'none'
            }}
          >
            <div className="text-center text-white p-3">
              <h4 className="mb-3">
                <i className="bi bi-person-fill me-2" />
                Guest Information
              </h4>
              {room.guests_in_room && room.guests_in_room.map((guest, index) => (
                <div key={guest.id || index} className="mb-3">
                  <h5 className="text-light">
                    {guest.first_name} {guest.last_name}
                  </h5>
                  <p className="mb-1">
                    <i className="bi bi-calendar-check me-2" />
                    Staying: {calculateStayDuration(guest.check_in_date || guest.created_at)}
                  </p>
                  {guest.check_in_date && (
                    <small className="text-light opacity-75">
                      Since: {new Date(guest.check_in_date).toLocaleDateString()}
                    </small>
                  )}
                </div>
              ))}
              <div className="mt-3">
                <small className="text-light opacity-75">
                  <i className="bi bi-cursor-pointer me-1" />
                  Click to view room details
                </small>
              </div>
            </div>
          </div>
        )}

        <div className="card-body d-flex flex-column">
          <h5 className="card-title mb-3 text-center text-white fw-bold py-2 main-bg">
            Room {room.room_number}
          </h5>
          <p className="card-text mb-3">
            <strong>Guest PIN:</strong> {room.guest_id_pin || "Not assigned"}
            <br />
            <strong>Occupied:</strong> {room.is_occupied ? "Yes" : "No"}
          </p>

          <div className="mb-3 text-center" onClick={(e) => e.stopPropagation()}>
            <select
              className="form-select form-select-sm mb-2"
              value={qrType}
              onChange={handleQrChange}
            >
              <option value="">Select QR type</option>
              {qrEntries.map(([key]) => (
                <option key={key} value={formatQrName(key)}>
                  {formatQrName(key)}
                </option>
              ))}
            </select>
            {qrType && <RoomQr type={qrType} url={qrMap[qrType]} />}
          </div>

          <button
            className="btn btn-sm main-bg-outline mt-2"
            onClick={(e) => {
              e.stopPropagation();
              generateSingleRoomQrPdf(room);
            }}
          >
            <i className="bi bi-download me-1" />
            Download QR PDF
          </button>

          <div className="form-check m-2 text-black bg-light p-1 rounded" onClick={(e) => e.stopPropagation()}>
            <input
              id={`select-room-${room.id}`}
              className="form-check-input"
              type="checkbox"
              checked={selectedRooms.includes(room.id)}
              onChange={() => onSelect(room.id)}
            />
            <label htmlFor={`select-room-${room.id}`} className="form-check-label small">
              Select room for checkout.
            </label>
          </div>

          <div className="button-wraper w-100 d-flex justify-content-center mt-2">
            {!room.is_occupied && (
              <button
                className="btn main-text second-text custom-button me-2"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/rooms/${room.room_number}/add-guest`);
                }}
              >
                Assign Guest
              </button>
            )}
          </div>

          {room.is_occupied && (
            room.guests_in_room.map((guest) => (
                    <span 
                      key={guest.id} 
                      className="bg-danger text-white border text-center p-1 rounded-pill"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setIsHovering(true)}
                      onMouseLeave={() => setIsHovering(false)}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/rooms/${room.hotel_slug}/rooms/${room.room_number}`);
                      }}
                    >
                     OCCUPIED
                    </span>
                  ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
