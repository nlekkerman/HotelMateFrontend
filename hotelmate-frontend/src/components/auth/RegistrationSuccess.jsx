import React from 'react';

const RegistrationSuccess = () => {
  return (
    <div className="container mt-5">
      <div className="alert alert-success" role="alert">
        <h4 className="alert-heading">Profile Created Successfully!</h4>
        <p>
          You have created your profile on <strong>HotelsMates</strong> successfully.
          Please wait to be added to your hotel staff by an administrator.
        </p>
      </div>
    </div>
  );
};

export default RegistrationSuccess;
