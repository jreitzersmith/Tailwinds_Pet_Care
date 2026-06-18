import PropTypes from 'prop-types';
import { COLORS, FONTS } from '../../constants.jsx';

function ServiceCard({ name, description }) {
  const cardStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #dde8f4',
    borderRadius: '6px',
    padding: '1.4rem 1.6rem',
    boxShadow: '0 2px 8px rgba(104,175,230,0.10)',
  };

  const nameStyle = {
    fontFamily: FONTS.header,
    fontSize: '1.05rem',
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: '0.5rem',
  };

  const descStyle = {
    fontFamily: FONTS.body,
    fontSize: '0.93rem',
    color: '#555',
    lineHeight: 1.65,
  };

  return (
    <div style={cardStyle}>
      <h3 style={nameStyle}>{name}</h3>
      <p style={descStyle}>{description}</p>
    </div>
  );
}

ServiceCard.propTypes = {
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

export default ServiceCard;
