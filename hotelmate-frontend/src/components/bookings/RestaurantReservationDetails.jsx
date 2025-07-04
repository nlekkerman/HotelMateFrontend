// src/components/bookings/RestaurantReservationDetails.jsx

import React from "react";
import { Card, Row, Col, Badge, Button } from "react-bootstrap";

export default function RestaurantReservationDetails({ booking, onClose }) {
  if (!booking) return null;

  const { date, time, note, created_at, seats, restaurant } = booking;
  const { total = "—", adults = 0, children = 0, infants = 0 } = seats || {};

  return (
    <Card className="bg-light text-dark shadow-sm mb-3">
      <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
        <span>Reservation Details</span>
        {onClose && (
          <Button variant="light" size="sm" onClick={onClose}>
            ✕
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        <Row className="mb-2">
          <Col><strong>Restaurant:</strong> {restaurant?.name || "N/A"}</Col>
          <Col><strong>Created At:</strong> {new Date(created_at).toLocaleString()}</Col>
        </Row>
        <Row className="mb-2">
          <Col><strong>Date:</strong> {date}</Col>
          <Col><strong>Time:</strong> {time}</Col>
        </Row>
        <Row className="mb-2">
          <Col><strong>Note:</strong> {note || "None"}</Col>
        </Row>
        <Row className="text-center">
          <Col><Badge bg="secondary">Total: {total}</Badge></Col>
          <Col><Badge bg="success">Adults: {adults}</Badge></Col>
          <Col><Badge bg="info">Children: {children}</Badge></Col>
          <Col><Badge bg="warning">Infants: {infants}</Badge></Col>
        </Row>
      </Card.Body>
    </Card>
  );
}
