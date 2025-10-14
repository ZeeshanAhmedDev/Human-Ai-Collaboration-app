import React from 'react';

const AgentStatus = ({ isProcessing }) => {
  const agents = [
    { id: 'planner', name: 'Architect', icon: '🎯', color: '#4f46e5' },
    { id: 'developer', name: 'Developer', icon: '💻', color: '#059669' },
    { id: 'tester', name: 'QA Engineer', icon: '🧪', color: '#dc2626' },
    { id: 'reviewer', name: 'Reviewer', icon: '🔍', color: '#7c3aed' }
  ];

  return (
    <div className="agent-status">
      <div className="status-header">
        <h3>AI Team Status</h3>
        <div className={`processing-indicator ${isProcessing ? 'processing' : 'idle'}`}>
          {isProcessing ? '⚡ AI Team Working...' : '✅ Ready'}
        </div>
      </div>
      
      <div className="agents-grid">
        {agents.map(agent => (
          <div key={agent.id} className="agent-card">
            <div 
              className="agent-icon"
              style={{ backgroundColor: agent.color }}
            >
              {agent.icon}
            </div>
            <div className="agent-info">
              <span className="agent-name">{agent.name}</span>
              <div className={`agent-state ${isProcessing ? 'working' : 'ready'}`}>
                {isProcessing ? 'Working...' : 'Ready'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentStatus;