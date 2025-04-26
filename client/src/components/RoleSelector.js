// src/components/RoleSelector.js
function RoleSelector({ role, setRole }) {
    return (
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="doctor">Doctor</option>
        <option value="patient">Patient</option>
      </select>
    );
  }

  export default RoleSelector;
