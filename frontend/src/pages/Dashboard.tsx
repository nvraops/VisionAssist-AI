import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiClock, FiMapPin, FiActivity, FiEye, FiPhone, FiNavigation } from 'react-icons/fi';

const Dashboard = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = [
    { label: "Active Session", value: "01:23:45", icon: <FiClock size={24} />, color: "#34c759" },
    { label: "Detections", value: "142", icon: <FiEye size={24} />, color: "#007aff" },
    { label: "Location", value: "City Center", icon: <FiMapPin size={24} />, color: "#ff9500" },
    { label: "Commands", value: "12", icon: <FiActivity size={24} />, color: "#af52de" }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: `rgba(255,255,255,0.1)`, padding: '12px', borderRadius: '50%', color: stat.color }}>
                  {stat.icon}
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{stat.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stat.value}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div className="glass-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h3>Recent Activity</h3>
          <div style={{ marginTop: '15px' }}>
            {['Person detected ahead', 'Navigating to Library', 'Read sign: "Exit"', 'Bus 21G verified'].map((act, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FiActivity color="var(--text-secondary)" />
                {act}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div className="glass-panel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
        <h3>Quick Actions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          <button className="glass-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px' }}>
            <FiPhone size={20} /> Call Emergency
          </button>
          <button className="glass-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px' }}>
            <FiNavigation size={20} /> Navigate Home
          </button>
          <button className="glass-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px' }}>
            <FiEye size={20} /> Describe Scene
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
