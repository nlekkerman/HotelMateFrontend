import React from "react";
import { Card, Row, Col, Badge, Button } from "react-bootstrap";

export default function RestaurantReservationDetails({ booking, onClose }) {
  if (!booking) return null;

  const {
    date,
    time,
    note,
    created_at,
    seats,
    restaurant,
    room,
    guest,
  } = booking;

  const {
    total = "—",
    adults = 0,
    children = 0,
    infants = 0,
  } = seats || {};

  return (
    <Card className="bg-white text-dark shadow-sm mb-4 border-0">
      <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">🍽️ Reservation Details</h5>
        {onClose && (
          <Button variant="outline-light" size="sm" onClick={onClose}>
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
            <strong>Time:</strong> {time || "—"}
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
            <strong>Note:</strong> {note || "None"}
          </Col>
        </Row>

        <hr />

        <Row className="text-center">
          <Col>
            <Badge bg="secondary" pill>🧮 Total: {total}</Badge>
          </Col>
          <Col>
            <Badge bg="success" pill>👨 Adults: {adults}</Badge>
          </Col>
          <Col>
            <Badge bg="info" pill>🧒 Children: {children}</Badge>
          </Col>
          <Col>
            <Badge bg="warning" pill>👶 Infants: {infants}</Badge>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}
