import React from 'react';
import { CheckCircle2, CircleDashed, Code2, ClipboardList, FileSearch, FlaskConical } from 'lucide-react';

const agents = [
  {
    id: 'planner',
    name: 'Planner',
    role: 'Architecture',
    icon: ClipboardList,
    accent: 'indigo'
  },
  {
    id: 'developer',
    name: 'Developer',
    role: 'Implementation',
    icon: Code2,
    accent: 'teal'
  },
  {
    id: 'tester',
    name: 'Tester',
    role: 'Validation',
    icon: FlaskConical,
    accent: 'amber'
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    role: 'Quality',
    icon: FileSearch,
    accent: 'rose'
  }
];

const AgentStatus = ({ isProcessing }) => {
  return (
    <section className="agent-strip" aria-label="AI agent status">
      <div className="agent-strip-header">
        <div>
          <p className="eyebrow">Agent pipeline</p>
          <h2>{isProcessing ? 'Collaboration in progress' : 'Ready for a project goal'}</h2>
        </div>
        <div className={`pipeline-state ${isProcessing ? 'running' : 'idle'}`}>
          {isProcessing ? (
            <CircleDashed size={16} strokeWidth={2.2} />
          ) : (
            <CheckCircle2 size={16} strokeWidth={2.2} />
          )}
          <span>{isProcessing ? 'Running' : 'Idle'}</span>
        </div>
      </div>

      <div className="agents-grid">
        {agents.map((agent) => {
          const AgentIcon = agent.icon;

          return (
            <article className={`agent-card ${agent.accent}`} key={agent.id}>
              <div className="agent-card-icon">
                <AgentIcon size={20} strokeWidth={1.9} />
              </div>
              <div className="agent-card-copy">
                <h3>{agent.name}</h3>
                <p>{agent.role}</p>
              </div>
              <span className={`agent-state ${isProcessing ? 'working' : 'ready'}`}>
                {isProcessing ? 'Working' : 'Ready'}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AgentStatus;
