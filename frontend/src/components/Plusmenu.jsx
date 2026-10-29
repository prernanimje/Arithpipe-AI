import React, { useRef, useState } from "react";
import "../styles/plusmenu.css";

const PlusMenu = ({ onFileSelect }) => {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef(null);

  const menuItems = ["CSV", "JSON", "Excel", "XML", "Attachments"];

  const handleMenuClick = (item) => {
    setOpen(false);
    if (item !== "Attachments") {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="plus-menu-wrapper">
      <button
        type="button"
        className="plus-btn"
        onClick={() => setOpen((prev) => !prev)}
      >
        +
      </button>

      {open && (
        <div className="menu-dropdown">
          {menuItems.map((item) => (
            <div
              key={item}
              className="menu-item"
              onClick={() => handleMenuClick(item)}
            >
              {item}
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json,.xlsx,.xml"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default PlusMenu;
