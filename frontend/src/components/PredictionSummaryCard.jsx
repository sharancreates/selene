import React from 'react';
import { motion } from 'framer-motion';

export default function PredictionSummaryCard({ prediction, activePhase, user, phases }) {
  const currentPhaseConfig = phases.find(p => p.id === activePhase) || phases[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        backgroundColor: currentPhaseConfig.bg,
        borderRadius: '24px',
        padding: '32px',
        color: currentPhaseConfig.textColor,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(0,0,0,0.05)',
        border: '1px solid rgba(255,255,255,0.6)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, marginBottom: '16px', backdropFilter: 'blur(4px)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: currentPhaseConfig.color }}></span>
            Current Phase: {currentPhaseConfig.name}
          </div>
          
          <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
            {prediction && prediction.next_period_date ? (
              <>Next Cycle Expected in <span style={{ color: currentPhaseConfig.color }}>{prediction.days_until_period} Days</span></>
            ) : (
              <>Calibrating Body Rhythm</>
            )}
          </h2>

          <p style={{ fontSize: '15px', lineHeight: '1.6', margin: '0 0 20px 0', maxWidth: '600px', opacity: 0.9 }}>
            {prediction && prediction.insight ? prediction.insight : currentPhaseConfig.prediction}
          </p>

          {prediction && prediction.prediction_error_bounds && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', opacity: 0.75, backgroundColor: 'rgba(0,0,0,0.04)', padding: '4px 10px', borderRadius: '8px' }}>
              <span>Confidence Window: {prediction.prediction_error_bounds}</span>
            </div>
          )}
        </div>

        {prediction && prediction.next_period_date && (
          <div style={{ backgroundColor: 'rgba(255,255,255,0.85)', padding: '20px 24px', borderRadius: '18px', textAlign: 'center', minWidth: '140px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.5)' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', tracking: '0.05em', opacity: 0.7, fontWeight: 600, marginBottom: '4px' }}>Estimated Start</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: currentPhaseConfig.color }}>
              {new Date(prediction.next_period_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        )}
      </div>

      {prediction && prediction.medical_disclaimer && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: '11px', opacity: 0.65, fontStyle: 'italic' }}>
          {prediction.medical_disclaimer}
        </div>
      )}
    </motion.div>
  );
}
