import { motion } from 'framer-motion';
import '../styles/notification.css';

export default function Notification({ message }) {
    if (!message) return null;
    
    const isError = message.toLowerCase().includes('ошибка');
    const isWarning = message.toLowerCase().includes('внимание') || message.toLowerCase().includes('точно');

    const getBadgeIcon = () => {
        if (isError) return '❌';
        if (isWarning) return '⚠️';
        return '🌿'; 
    };

    return (
        <motion.div
            className={`notification-container ${isError ? 'error' : isWarning ? 'warning' : 'success'}`}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 23 }}
        >
            <div className="notification-badge">
                <span className="notification-icon">{getBadgeIcon()}</span> {message}
            </div>
        </motion.div>
    );
}