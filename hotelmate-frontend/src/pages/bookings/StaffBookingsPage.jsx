import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Spinner, Alert } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api, { buildStaffURL } from '@/services/api';
import BookingDetailModal from '@/components/bookings/BookingDetailModal';

/**
 * StaffBookingsPage - Staff view for managing hotel room bookings
 */
const StaffBookingsPage = () => {
  const { hotelSlug } = useParams();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch bookings
  const { data: bookings, isLoading, error, refetch } = useQuery({
    queryKey: ['staffRoomBookings', hotelSlug, statusFilter],
    queryFn: async () => {
      const url = buildStaffURL(hotelSlug, 'bookings', '/');
      const response = await api.get(url);
      return response.data;
    },
    enabled: !!hotelSlug,
  });

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedBooking(null);
  };

  const handleBookingUpdated = () => {
    refetch();
  };

  // Filter bookings
  const filteredBookings = bookings?.filter(booking => {
    const matchesStatus = statusFilter === 'all' || booking.status?.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch = !searchTerm || 
      booking.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.guest_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.booking_reference?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { bg: 'warning', text: 'Pending' },
      confirmed: { bg: 'success', text: 'Confirmed' },
      cancelled: { bg: 'danger', text: 'Cancelled' },
      completed: { bg: 'secondary', text: 'Completed' },
      checked_in: { bg: 'info', text: 'Checked In' },
      checked_out: { bg: 'dark', text: 'Checked Out' },
    };
    const config = statusMap[status?.toLowerCase()] || { bg: 'secondary', text: status };
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const getPaymentStatusBadge = (status) => {
    const statusMap = {
      paid: { bg: 'success', icon: 'check-circle-fill' },
      pending: { bg: 'warning', icon: 'clock-fill' },
      failed: { bg: 'danger', icon: 'x-circle-fill' },
      refunded: { bg: 'info', icon: 'arrow-counterclockwise' },
    };
    const config = statusMap[status?.toLowerCase()] || { bg: 'secondary', icon: 'question-circle' };
    return (
      <Badge bg={config.bg}>
        <i className={`bi bi-${config.icon} me-1`}></i>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading bookings...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Failed to load bookings: {error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-3">
            <i className="bi bi-calendar-check me-2"></i>
            Room Bookings Management
          </h2>
          <p className="text-muted">View and manage hotel room bookings</p>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Search</Form.Label>
            <Form.Control
              type="text"
              placeholder="Search by guest name, email, or booking reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Status Filter</Form.Label>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={3} className="d-flex align-items-end">
          <Button variant="outline-primary" onClick={() => refetch()} className="w-100">
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </Button>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-primary">
            <Card.Body className="text-center">
              <h3 className="mb-1 text-primary">
                {bookings?.filter(b => b.status?.toLowerCase() === 'pending').length || 0}
              </h3>
              <p className="mb-0 text-muted small">Pending Confirmation</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-success">
            <Card.Body className="text-center">
              <h3 className="mb-1 text-success">
                {bookings?.filter(b => b.status?.toLowerCase() === 'confirmed').length || 0}
              </h3>
              <p className="mb-0 text-muted small">Confirmed</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-info">
            <Card.Body className="text-center">
              <h3 className="mb-1 text-info">
                {bookings?.filter(b => b.status?.toLowerCase() === 'checked_in').length || 0}
              </h3>
              <p className="mb-0 text-muted small">Currently Checked In</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-secondary">
            <Card.Body className="text-center">
              <h3 className="mb-1">
                {bookings?.length || 0}
              </h3>
              <p className="mb-0 text-muted small">Total Bookings</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Bookings Table */}
      <Card>
        <Card.Body>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-1 text-muted"></i>
              <p className="text-muted mt-3">No bookings found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead className="table-light">
                  <tr>
                    <th>Reference</th>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Nights</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} style={{ cursor: 'pointer' }}>
                      <td>
                        <strong>{booking.booking_reference || `#${booking.id}`}</strong>
                      </td>
                      <td>
                        <div>
                          <strong>{booking.guest_name}</strong>
                          <br />
                          <small className="text-muted">{booking.guest_email}</small>
                        </div>
                      </td>
                      <td>
                        {booking.room_type?.name || booking.room?.name || 'N/A'}
                        {booking.room_number && <><br /><small className="text-muted">Room {booking.room_number}</small></>}
                      </td>
                      <td>
                        {booking.check_in_date ? format(new Date(booking.check_in_date), 'MMM dd, yyyy') : 'N/A'}
                      </td>
                      <td>
                        {booking.check_out_date ? format(new Date(booking.check_out_date), 'MMM dd, yyyy') : 'N/A'}
                      </td>
                      <td className="text-center">
                        {booking.number_of_nights || 
                         (booking.check_in_date && booking.check_out_date ? 
                          Math.ceil((new Date(booking.check_out_date) - new Date(booking.check_in_date)) / (1000 * 60 * 60 * 24)) : 
                          'N/A')}
                      </td>
                      <td>
                        <strong>${booking.total_amount || booking.total_price || 0}</strong>
                      </td>
                      <td>{getStatusBadge(booking.status)}</td>
                      <td>{getPaymentStatusBadge(booking.payment_status)}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleViewDetails(booking)}
                        >
                          <i className="bi bi-eye me-1"></i>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          show={showDetailModal}
          onHide={handleCloseModal}
          booking={selectedBooking}
          hotelSlug={hotelSlug}
          onBookingUpdated={handleBookingUpdated}
        />
      )}
    </Container>
  );
};

export default StaffBookingsPage;
