import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';

/**
 * LeisureActivitiesSection - Modern display of hotel facilities and activities
 * Uses theme colors from staff settings
 */
const LeisureActivitiesSection = ({ hotel }) => {
  const activities = hotel?.leisure_activities || [];

  if (activities.length === 0) return null;

  const getCategoryIcon = (category) => {
    const icons = {
      Wellness: 'heart-pulse',
      Family: 'people',
      Dining: 'cup-hot',
      Recreation: 'water',
      Business: 'briefcase',
      Sports: 'bicycle',
      Entertainment: 'music-note-beamed',
    };
    return icons[category] || 'star';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
  };

  return (
    <section className="modern-activities-section">
      <div className="section-container">
        {/* Section Header */}
        <motion.div
          className="text-center mb-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-heading mb-3">Leisure & Facilities</h2>
          <p className="section-subheading">
            Explore the amenities and activities that make your stay special
          </p>
        </motion.div>

        {/* Activities Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <Row xs={1} md={2} lg={3} className="g-4">
            {activities.map((activity) => (
              <Col key={activity.id}>
                <motion.div
                  className="modern-activity-card"
                  variants={itemVariants}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  {/* Activity Icon */}
                  <div className="modern-activity-icon">
                    <i className={`bi bi-${getCategoryIcon(activity.category)}`}></i>
                  </div>

                  {/* Activity Title */}
                  <h3 className="modern-activity-title">{activity.name}</h3>

                  {/* Category Badge */}
                  <div className="modern-activity-category">
                    {activity.category}
                  </div>

                  {/* Activity Description */}
                  {activity.short_description && (
                    <p className="modern-room-description">
                      {activity.short_description}
                    </p>
                  )}
                </motion.div>
              </Col>
            ))}
          </Row>
        </motion.div>
      </div>
    </section>
  );
};

export default LeisureActivitiesSection;
