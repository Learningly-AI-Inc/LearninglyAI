export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '900px',
          padding: '40px',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(2rem, 8vw, 5rem)',
            fontWeight: 900,
            color: '#ff4444',
            textTransform: 'uppercase',
            lineHeight: 1.1,
            marginBottom: '30px',
            textShadow: '0 0 30px rgba(255, 68, 68, 0.5), 0 0 60px rgba(255, 68, 68, 0.3)',
            letterSpacing: '-0.02em',
          }}
        >
          The Founder of Learningly Has Not Paid Their Developer for Months
        </h1>

        <div
          style={{
            width: '100px',
            height: '4px',
            background: '#ff4444',
            margin: '0 auto 30px',
            borderRadius: '2px',
          }}
        />

        <p
          style={{
            fontSize: 'clamp(1rem, 3vw, 1.5rem)',
            color: '#ffffff',
            opacity: 0.9,
            lineHeight: 1.6,
            marginBottom: '20px',
          }}
        >
          Developers deserve to be paid for their work.
        </p>

        <p
          style={{
            fontSize: 'clamp(0.9rem, 2vw, 1.2rem)',
            color: '#aaaaaa',
            lineHeight: 1.6,
          }}
        >
          This service is unavailable until outstanding payments are resolved.
        </p>
      </div>
    </div>
  );
}
