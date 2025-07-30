import React, { useState, useEffect } from "react";

const RoomQr = ({ type, url }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (url) setShow(true);
    else setShow(false);
  }, [type, url]);

  if (!url) return null;

  return (
    <div className="text-center">
      {show && (
        <>
          <h6 className="mb-1">{type}</h6>
          <img
            src={url}
            alt={`${type} QR`}
            style={{ width: 120, height: 120, objectFit: "contain" }}
          />
        </>
      )}
    </div>
  );
};

export default RoomQr;
