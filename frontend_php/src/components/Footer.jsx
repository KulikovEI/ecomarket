import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ECO_TIPS } from '../data/tipsData.jsx';
import '../styles/footer.css';

const Footer = memo(function Footer() {


  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!ECO_TIPS || ECO_TIPS.length === 0) return;

    const interval = setInterval(() => {
      setTipIndex((prevIndex) => (prevIndex + 1) % ECO_TIPS.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const currentTip = ECO_TIPS && ECO_TIPS.length > 0
      ? ECO_TIPS[tipIndex]
      : "Загрузка полезных эко-советов...";

  return (
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-section main-brand-col">
            <h3 className="footer-section-title">EcoMarket</h3>
            <p className="footer-brand-description">
              Мы помогаем оценивать и
              снижать персональный углеродный след при покупках.
            </p>
            <div className="footer-tips-widget">
              <h4 className="tips-widget-title">Эко-совет дня 🌿</h4>
              <div className="tip-container">
                <AnimatePresence mode="wait">
                  <motion.p
                      key={ECO_TIPS?.length ? tipIndex : 'empty'}
                      className="eco-tip"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                  >
                    {currentTip}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="footer-section social-links-col">
            <h3 className="footer-section-title">Мы в соцсетях</h3>
            <ul className="footer-links-list">
              <li><a href="https://instagram.com" target="_blank" rel="noreferrer" className="footer-nav-btn">Instagram</a></li>
              <li><a href="https://twitter.com" target="_blank" rel="noreferrer" className="footer-nav-btn">Twitter</a></li>
              <li><a href="https://facebook.com" target="_blank" rel="noreferrer" className="footer-nav-btn">Facebook</a></li>
              <li><a href="https://youtube.com" target="_blank" rel="noreferrer" className="footer-nav-btn">Youtube</a></li>
            </ul>
          </div>

          <div className="footer-mascot-section">
            <div className="footer-mascot-badge-wrap">
              <div className="footer-mascot-circle">
                <img
                    src="/images/mascot.png"
                    alt="Маскот EcoMarket"
                    className="footer-mascot-img"
                />
              </div>
              <span className="footer-mascot-text-badge">EcoMarket</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} EcoMarket. Все права защищены.</p>
        </div>
      </footer>
  );
});

export default Footer;