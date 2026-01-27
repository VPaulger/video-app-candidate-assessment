import { useState } from 'react';
import ICON_SIZE from 'components/Icons/IconSize';
import PropTypes from 'prop-types';

const CloseIcon = ({ size = ICON_SIZE.REGULAR, color = '#C7CED1', hoverColor = '#FFFFFF' }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="closeIcon"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      <path
        d="M17 1L1 17M1 1L17 17"
        stroke={isHovered ? (hoverColor || color) : color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
CloseIcon.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  color: PropTypes.string,
};
export default CloseIcon;
