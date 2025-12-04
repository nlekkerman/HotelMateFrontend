import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigation } from '@/hooks/useNavigation';

const UserDebugInfo = () => {
  const { user } = useAuth();
  const { canAccessNav, allowedNavs, isSuperUser, accessLevel } = usePermissions();
  const { visibleNavItems, allNavItems, hasNavigation } = useNavigation();

  // Get raw localStorage data
  let storedUser = null;
  try {
    storedUser = JSON.parse(localStorage.getItem('user'));
  } catch {
    storedUser = null;
  }

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header">
          <h4>🔍 User Debug Information for Navigation Issues</h4>
        </div>
        <div className="card-body">
          
          {/* User Context */}
          <div className="mb-4">
            <h5>👤 User Context Data</h5>
            <pre className="bg-light p-3 rounded">
              {JSON.stringify({
                username: user?.username,
                hotel_slug: user?.hotel_slug,
                is_superuser: user?.is_superuser,
                role: user?.role,
                access_level: user?.access_level,
                allowed_navs: user?.allowed_navs,
              }, null, 2)}
            </pre>
          </div>

          {/* Raw localStorage */}
          <div className="mb-4">
            <h5>💾 Raw localStorage Data</h5>
            <pre className="bg-light p-3 rounded">
              {JSON.stringify({
                username: storedUser?.username,
                hotel_slug: storedUser?.hotel_slug,
                is_superuser: storedUser?.is_superuser,
                role: storedUser?.role,
                access_level: storedUser?.access_level,
                allowed_navs: storedUser?.allowed_navs,
                navigation_items: storedUser?.navigation_items?.length || 0
              }, null, 2)}
            </pre>
          </div>

          {/* Permissions Hook Results */}
          <div className="mb-4">
            <h5>🔐 Permissions Hook Results</h5>
            <pre className="bg-light p-3 rounded">
              {JSON.stringify({
                isSuperUser,
                accessLevel,
                allowedNavs,
                hasNavigation
              }, null, 2)}
            </pre>
          </div>

          {/* Navigation Items */}
          <div className="mb-4">
            <h5>🧭 Navigation Analysis</h5>
            <div className="row">
              <div className="col-md-6">
                <h6>All Available Navigation Items ({allNavItems.length})</h6>
                <ul className="list-group">
                  {allNavItems.map((item, index) => (
                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>
                        <strong>{item.slug}</strong> - {item.name}
                      </span>
                      <span className={`badge ${canAccessNav(item.slug) ? 'bg-success' : 'bg-danger'}`}>
                        {canAccessNav(item.slug) ? 'ALLOWED' : 'BLOCKED'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="col-md-6">
                <h6>Visible Navigation Items ({visibleNavItems.length})</h6>
                <ul className="list-group">
                  {visibleNavItems.map((item, index) => (
                    <li key={index} className="list-group-item">
                      <strong>{item.slug}</strong> - {item.name}
                      <br />
                      <small className="text-muted">{item.path}</small>
                    </li>
                  ))}
                </ul>
                
                {visibleNavItems.length === 0 && (
                  <div className="alert alert-warning">
                    <h6>❌ No Navigation Items Visible</h6>
                    <p>This is why Nikola can't see navigation links!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Fixes */}
          <div className="alert alert-warning">
            <h6>🛠️ Quick Fixes</h6>
            <div className="row">
              <div className="col-md-6">
                <button 
                  className="btn btn-warning btn-sm w-100 mb-2"
                  onClick={() => {
                    // Add all default navigation items to localStorage user
                    try {
                      const user = JSON.parse(localStorage.getItem('user'));
                      if (user) {
                        user.allowed_navs = ['home', 'reception', 'rooms', 'guests', 'staff', 'stock_tracker', 'chat', 'room_service', 'breakfast', 'bookings', 'hotel_info', 'games'];
                        localStorage.setItem('user', JSON.stringify(user));
                        window.location.reload();
                      }
                    } catch (e) {
                      console.error('Failed to update user:', e);
                    }
                  }}
                >
                  ⚡ Quick Fix: Add All Nav Items
                </button>
                
                <button 
                  className="btn btn-success btn-sm w-100 mb-2"
                  onClick={() => {
                    // Make user superuser
                    try {
                      const user = JSON.parse(localStorage.getItem('user'));
                      if (user) {
                        user.is_superuser = true;
                        localStorage.setItem('user', JSON.stringify(user));
                        window.location.reload();
                      }
                    } catch (e) {
                      console.error('Failed to update user:', e);
                    }
                  }}
                >
                  🔓 Make Superuser (Temporary)
                </button>
              </div>
              
              <div className="col-md-6">
                <button 
                  className="btn btn-info btn-sm w-100 mb-2"
                  onClick={() => {
                    console.log('=== RAW USER DATA ===');
                    console.log('localStorage user:', localStorage.getItem('user'));
                    console.log('AuthContext user:', user);
                    console.log('Parsed user:', storedUser);
                    alert('Check browser console (F12) for raw data');
                  }}
                >
                  📋 Log Raw Data to Console
                </button>
                
                <button 
                  className="btn btn-danger btn-sm w-100 mb-2"
                  onClick={() => {
                    if (confirm('This will log you out. Continue?')) {
                      localStorage.clear();
                      window.location.href = '/login';
                    }
                  }}
                >
                  🚪 Clear All & Logout
                </button>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="alert alert-info">
            <h6>💡 Debugging Steps</h6>
            <ol>
              <li><strong>Check allowed_navs array:</strong> Should contain navigation slugs like ['home', 'reception', 'stock_tracker']</li>
              <li><strong>Verify backend response:</strong> Login API should return allowed_navs field</li>
              <li><strong>Check user permissions:</strong> User might need navigation permissions assigned in backend</li>
              <li><strong>Try superuser account:</strong> Django superusers bypass all navigation restrictions</li>
            </ol>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserDebugInfo;