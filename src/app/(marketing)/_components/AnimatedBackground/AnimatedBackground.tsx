import styles from "./AnimatedBackground.module.css";

export default function AnimatedBackground() {
  return (
    <div className={styles.background} aria-hidden="true">
      <div className={styles.grid} />
      <div className={`${styles.blob} ${styles.blobOne}`} />
      <div className={`${styles.blob} ${styles.blobTwo}`} />
      <div className={`${styles.blob} ${styles.blobThree}`} />
      <div className={`${styles.blob} ${styles.blobFour}`} />
    </div>
  );
}
