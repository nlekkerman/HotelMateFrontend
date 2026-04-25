import React, { useState, useEffect } from "react";
import { Card, Button, Form, ListGroup, Badge, Spinner } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "@/services/api";
import { useCan } from "@/rbac";

export default function SectionDepartmentsRoles() {
  const { hotelSlug } = useParams();
  // Phase 1 RBAC: backend-driven action authority via `user.rbac.staff_management.actions.<key>`.
  const { can } = useCan();
  const canDepartmentRead = can('staff_management', 'department_read');
  const canDepartmentManage = can('staff_management', 'department_manage');
  const canRoleRead = can('staff_management', 'role_read');
  const canRoleManage = can('staff_management', 'role_manage');
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState("");
  const [newRole, setNewRole] = useState("");
  const [savingDept, setSavingDept] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, [hotelSlug]);

  const fetchMetadata = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/staff/${hotelSlug}/metadata/`);
      setDepartments(response.data.departments || []);
      setRoles(response.data.roles || []);
    } catch (err) {
      console.error("Failed to fetch metadata:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!newDept.trim()) return;
    setSavingDept(true);
    try {
      await api.post(`/staff/${hotelSlug}/departments/`, { name: newDept.trim() });
      toast.success(`Department "${newDept.trim()}" created`);
      setNewDept("");
      await fetchMetadata();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.name?.[0] || "Failed to create department");
    } finally {
      setSavingDept(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRole.trim()) return;
    setSavingRole(true);
    try {
      await api.post(`/staff/${hotelSlug}/roles/`, { name: newRole.trim() });
      toast.success(`Role "${newRole.trim()}" created`);
      setNewRole("");
      await fetchMetadata();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.name?.[0] || "Failed to create role");
    } finally {
      setSavingRole(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="text-center py-4">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading departments & roles...
        </Card.Body>
      </Card>
    );
  }

  if (!canDepartmentRead && !canRoleRead) return null;

  return (
    <Card className="shadow-sm mb-4">
      <Card.Body className="p-4">
        <h5 className="mb-3">
          <i className="bi bi-diagram-3 me-2"></i>
          Departments & Roles
        </h5>
        <p className="text-muted mb-4">
          Manage departments and roles for your hotel staff. These are required when creating staff profiles.
        </p>

        <div className="row">
          {/* Departments */}
          {canDepartmentRead && (
          <div className="col-md-6 mb-3">
            <h6 className="fw-bold mb-3">
              <i className="bi bi-building me-1"></i> Departments
              <Badge bg="secondary" className="ms-2">{departments.length}</Badge>
            </h6>

            {departments.length > 0 ? (
              <ListGroup className="mb-3" style={{ maxHeight: 200, overflowY: "auto" }}>
                {departments.map((d) => (
                  <ListGroup.Item key={d.id} className="py-2 d-flex justify-content-between align-items-center">
                    {d.name}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <div className="alert alert-warning py-2 mb-3">
                <i className="bi bi-exclamation-triangle me-1"></i>
                No departments yet. Create one below.
              </div>
            )}

            <Form onSubmit={handleCreateDepartment} className="d-flex gap-2">
              <Form.Control
                size="sm"
                type="text"
                placeholder="e.g. Front Desk"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                disabled={!canDepartmentManage}
              />
              {canDepartmentManage && (
                <Button type="submit" size="sm" variant="primary" disabled={savingDept || !newDept.trim()}>
                  {savingDept ? <Spinner animation="border" size="sm" /> : "Add"}
                </Button>
              )}
            </Form>
          </div>
          )}

          {/* Roles */}
          {canRoleRead && (
          <div className="col-md-6 mb-3">
            <h6 className="fw-bold mb-3">
              <i className="bi bi-person-gear me-1"></i> Roles
              <Badge bg="secondary" className="ms-2">{roles.length}</Badge>
            </h6>

            {roles.length > 0 ? (
              <ListGroup className="mb-3" style={{ maxHeight: 200, overflowY: "auto" }}>
                {roles.map((r) => (
                  <ListGroup.Item key={r.id} className="py-2 d-flex justify-content-between align-items-center">
                    {r.name}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <div className="alert alert-warning py-2 mb-3">
                <i className="bi bi-exclamation-triangle me-1"></i>
                No roles yet. Create one below.
              </div>
            )}

            <Form onSubmit={handleCreateRole} className="d-flex gap-2">
              <Form.Control
                size="sm"
                type="text"
                placeholder="e.g. Manager"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                disabled={!canRoleManage}
              />
              {canRoleManage && (
                <Button type="submit" size="sm" variant="primary" disabled={savingRole || !newRole.trim()}>
                  {savingRole ? <Spinner animation="border" size="sm" /> : "Add"}
                </Button>
              )}
            </Form>
          </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
