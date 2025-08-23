import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RoomQr from "./RoomQr";
import { useSingleRoomQrPdfPrinter } from "@/components/rooms/hooks/useSingleRoomQrPdfPrinter";

const RoomCard = ({ room, selectedRooms, onSelect }) => {
  const navigate = useNavigate();
  const [qrType, setQrType] = useState("");
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

  return (
    <div
      className="col"
      style={{ cursor: "pointer" }}
      onClick={() =>
        navigate(`/rooms/${room.hotel_slug}/rooms/${room.room_number}`)
      }
    >
      <div className="card h-100 shadow-sm">
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
            <div className="text-danger text-center mt-1">
              Room is already occupied
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
