import React from "react";
import { Card, Row, Col, Badge, Button } from "react-bootstrap";

export default function RestaurantReservationDetails({ booking, onClose }) {
  if (!booking) return null;

  const {
    date,
    start_time,
    end_time,
    note,
    created_at,
    seats,
    restaurant,
    room,
    guest,
    voucher_code,
  } = booking;

  const {
    total = "—",
    adults = 0,
    children = 0,
    infants = 0,
  } = seats || {};

  return (
    <Card className="bg-white text-dark shadow-sm mb-4 border-0 d-flex flex-column w-100">
      <Card.Header className="main-bg text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">🍽️ Reservation Details</h5>
        {onClose && (
          <Button
            variant="outline-light"
            size="sm"
            onClick={onClose}
            className="ms-2"
          >
            ✕
          </Button>
        )}
      </Card.Header>

      <Card.Body>
        <Row className="mb-3">
          <Col md={6}>
            <strong>Restaurant:</strong> {restaurant?.name || "—"}
          </Col>
          <Col md={6}>
            <strong>Room:</strong> {room?.room_number || "—"}
          </Col>
        </Row>

        <Row className="mb-3">
          <Col md={6}>
            <strong>Date:</strong> {date || "—"}
          </Col>
          <Col md={6}>
            <strong>Time:</strong>{" "}
            {start_time && end_time
              ? `${start_time.slice(0, 5)} - ${end_time.slice(0, 5)}`
              : "—"}
          </Col>
        </Row>

        <Row className="mb-3">
          <Col md={6}>
            <strong>Guest:</strong> {guest?.full_name || "—"}
          </Col>
          <Col md={6}>
            <strong>Created At:</strong>{" "}
            {created_at ? new Date(created_at).toLocaleString() : "—"}
          </Col>
        </Row>

   
        <Row className="mb-3">
  <Col>
    <strong>Voucher:</strong>{" "}
    {voucher_code ? (
      <Badge bg="warning" text="dark" className="p-2">
        🎟️ {voucher_code}
      </Badge>
    ) : (
      <span className="text-danger">No voucher</span>
    )}
  </Col>
</Row>

       

        <Row className="mb-3">
          <Col>
            <strong>Note:</strong> {note || "None"}
          </Col>
        </Row>

        <hr />

        <Row className="text-center">
          <Col>
            <Badge bg="secondary" className="p-2" pill>
              🧮 Total: {total}
            </Badge>
          </Col>
          <Col>
            <Badge bg="success" className="p-2" pill>
              👨 Adults: {adults}
            </Badge>
          </Col>
          <Col>
            <Badge bg="primary" className="p-2" pill>
              🧒 Children: {children}
            </Badge>
          </Col>
          <Col>
            <Badge bg="danger" className="p-2" pill>
              👶 Infants: {infants}
            </Badge>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}
