import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <>
      <a className="visually-hidden-focusable" href="#main">Skip to content</a>

      <header>
        <div className="wrap nav-inner">
          <div className="nav-left">
            <Link className="logo" to="/">IdeaForge</Link>
            <nav className="nav-links">
              <a href="#discover">Discover</a>
              <a href="#how">How It Works</a>
              <a href="#graph">Research Landscape</a>
              <a href="#gap">Opportunities</a>
              <a href="#evidence">Evidence</a>
              <a href="#trust">About</a>
            </nav>
          </div>
          <div className="nav-right">
            <Link className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '14px' }} to="/dashboard">Workspace</Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="hero" id="discover">
          <div className="hero-content">
            <p className="eyebrow">AI-POWERED RESEARCH DISCOVERY</p>
            <h1>Discover What Research Hasn't Explored Yet.</h1>
            <p>IdeaForge analyzes academic literature, connects concepts across research papers, identifies underexplored research directions, and shows the evidence behind every opportunity.</p>
            <div className="hero-buttons">
              <a className="btn btn-primary" href="#gap">Explore Research</a>
              <a className="btn btn-secondary" href="#how">See How It Works</a>
            </div>
            <p className="hero-support">Evidence-driven · Explainable · Research-focused</p>
          </div>
        </section>

        {/* Problem */}
        <section className="problem">
          <div className="wrap">
            <div className="problem-header">
              <p className="eyebrow">THE RESEARCH PROBLEM</p>
              <h2>The answers are buried in thousands of papers.</h2>
              <p className="section-desc">Researchers spend countless hours reading papers, tracking related work, comparing methodologies, and searching for unanswered questions. The challenge isn't a lack of information — it's finding the meaningful connections hidden inside it.</p>
            </div>
            <div className="cards-3">
              <div className="card">
                <div className="card-icon">📚</div>
                <h3>Information Overload</h3>
                <p>Thousands of papers make it difficult to understand the complete research landscape.</p>
              </div>
              <div className="card">
                <div className="card-icon">🔗</div>
                <h3>Hidden Connections</h3>
                <p>Important relationships between research concepts may exist across different papers, communities, and disciplines.</p>
              </div>
              <div className="card">
                <div className="card-icon">🔍</div>
                <h3>Unclear Research Gaps</h3>
                <p>A popular topic does not necessarily reveal which combinations, limitations, or unanswered questions remain unexplored.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution */}
        <section>
          <div className="wrap">
            <div className="solution-header">
              <p className="eyebrow">MEET IDEAFORGE</p>
              <h2>From Papers to Research Opportunities.</h2>
              <p className="section-desc">IdeaForge transforms academic literature into an interconnected research landscape, combining semantic AI, knowledge graphs, statistical analysis, and evidence-based validation to identify opportunities worth investigating.</p>
            </div>
            <div className="solution-grid">
              <div className="solution-card">
                <div className="solution-num">01</div>
                <h3>Understand</h3>
                <p>Extract concepts, methods, datasets, limitations, future-work statements, and research signals from academic literature.</p>
              </div>
              <div className="solution-card">
                <div className="solution-num">02</div>
                <h3>Connect</h3>
                <p>Build a dynamic knowledge graph that reveals how research concepts relate across papers and communities.</p>
              </div>
              <div className="solution-card">
                <div className="solution-num">03</div>
                <h3>Discover</h3>
                <p>Detect meaningful relationships that are well studied individually but remain weakly explored together.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="how" id="how">
          <div className="wrap">
            <div className="how-header">
              <p className="eyebrow">FROM LITERATURE TO OPPORTUNITY</p>
              <h2>Six Steps From Papers to Insight.</h2>
              <p className="section-desc">IdeaForge transforms unstructured research literature into an explainable map of what is known, what is connected, and what is still unexplored.</p>
            </div>
            <div className="steps">
              <div className="step"><div className="step-num">01</div><div><h4>Ingest</h4><p>Upload research papers or build a literature corpus from supported academic sources.</p></div></div>
              <div className="step"><div className="step-num">02</div><div><h4>Understand</h4><p>Extract concepts, methods, datasets, limitations, future work, contradictions, and research signals.</p></div></div>
              <div className="step"><div className="step-num">03</div><div><h4>Connect</h4><p>Map concepts and their relationships into a research knowledge graph.</p></div></div>
              <div className="step"><div className="step-num">04</div><div><h4>Analyze</h4><p>Measure co-occurrence, semantic similarity, temporal overlap, community structure, and other research signals.</p></div></div>
              <div className="step"><div className="step-num">05</div><div><h4>Discover</h4><p>Identify concept combinations that are individually well studied but remain weakly explored together.</p></div></div>
              <div className="step"><div className="step-num">06</div><div><h4>Validate</h4><p>Check candidate opportunities against prior research, evidence strength, feasibility, and contradictory findings.</p></div></div>
            </div>
          </div>
        </section>

        {/* Knowledge Graph */}
        <section id="graph">
          <div className="wrap kg-inner">
            <div className="kg-copy">
              <p className="eyebrow">RESEARCH LANDSCAPE</p>
              <h2>See the Research Landscape, Not Just a List of Papers.</h2>
              <p>IdeaForge transforms literature into connected intelligence where concepts, methods, datasets, research problems, and papers become part of the same research landscape.</p>
              <ul className="kg-features">
                <li>Explore research communities</li>
                <li>Trace relationships between concepts</li>
                <li>Identify weak or missing connections</li>
                <li>Inspect supporting papers</li>
                <li>Follow evidence back to its source</li>
                <li>Visualize emerging research areas</li>
              </ul>
              <Link className="kg-link" to="/research-graph">Explore Research Knowledge Graph →</Link>
            </div>
            <div className="kg-visual" aria-hidden="true">
              <svg viewBox="0 0 400 400" fill="none">
                <g stroke="rgba(208,188,255,0.25)" strokeWidth={1}>
                  <line x1={120} y1={110} x2={200} y2={180}/>
                  <line x1={200} y1={180} x2={280} y2={120}/>
                  <line x1={200} y1={180} x2={180} y2={270}/>
                  <line x1={180} y1={270} x2={280} y2={300}/>
                  <line x1={120} y1={110} x2={90} y2={220}/>
                  <line x1={90} y1={220} x2={180} y2={270}/>
                  <line x1={280} y1={120} x2={320} y2={220}/>
                </g>
                <g stroke="rgba(208,188,255,0.08)" strokeWidth={1} strokeDasharray="4 6">
                  <line x1={90} y1={220} x2={320} y2={220}/>
                  <line x1={120} y1={110} x2={280} y2={300}/>
                </g>
                <g fill="#d0bcff">
                  <circle cx={120} cy={110} r={6}/>
                  <circle cx={200} cy={180} r={9}/>
                  <circle cx={280} cy={120} r={5}/>
                  <circle cx={180} cy={270} r={7}/>
                  <circle cx={280} cy={300} r={5}/>
                  <circle cx={90} cy={220} r={5}/>
                  <circle cx={320} cy={220} r={4}/>
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* Gap Detection */}
        <section className="gap" id="gap">
          <div className="wrap">
            <div className="gap-header">
              <p className="eyebrow">RESEARCH GAP DETECTION</p>
              <h2>Find the Connections That Haven't Been Explored Enough.</h2>
              <p className="section-desc">A potential research opportunity isn't simply a topic that appears rarely. IdeaForge looks for meaningful combinations where concepts are individually established but their intersection remains weakly explored.</p>
            </div>
            <div className="gap-visual">
              <div className="chip-row">
                <div className="chip"><strong>Federated Learning</strong><span>145 papers</span></div>
                <div className="chip-arrow">↔</div>
                <div className="chip"><strong>Differential Privacy Auditing</strong><span>98 papers</span></div>
              </div>
              <p className="weak-link">Only 2 papers explore the combination</p>
              <div className="gap-divider"></div>
              <div className="gap-result">
                <div className="gap-result-title">
                  <h4>Potential Research Opportunity</h4>
                  <span className="tier-badge">EVIDENCE TIER: HIGH</span>
                </div>
                <div className="gap-score"><span className="num">84%</span><span className="lbl">Evidence Score</span></div>
                <div className="metrics-row">
                  <div className="metric">
                    <div className="lrow"><span>Semantic Relevance</span><span>71%</span></div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: '71%' }}></div></div>
                  </div>
                  <div className="metric">
                    <div className="lrow"><span>Temporal Overlap</span><span>88%</span></div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: '88%' }}></div></div>
                  </div>
                  <div className="metric">
                    <div className="lrow"><span>Source Quality</span><span>91%</span></div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: '91%' }}></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Evidence */}
        <section id="evidence">
          <div className="wrap">
            <div className="evidence-header">
              <p className="eyebrow">EVIDENCE-FIRST AI</p>
              <h2>Don't Just Show the Gap. Show Us Why.</h2>
              <p className="section-desc">IdeaForge doesn't ask researchers to blindly trust an AI-generated suggestion. Every research opportunity is supported by traceable signals from the literature.</p>
            </div>
            <div className="evidence-grid">
              <div className="evidence-item"><h3>Future Work</h3><p>Identify research directions explicitly suggested by authors.</p></div>
              <div className="evidence-item"><h3>Limitations</h3><p>Surface unresolved limitations and weaknesses reported in existing studies.</p></div>
              <div className="evidence-item"><h3>Contradictions</h3><p>Detect conflicting findings and competing claims across papers.</p></div>
              <div className="evidence-item"><h3>Semantic Relevance</h3><p>Measure how closely related two concepts are beyond simple keyword matching.</p></div>
              <div className="evidence-item"><h3>Temporal Evidence</h3><p>Understand how research areas evolve and whether an unexplored intersection has persisted over time.</p></div>
              <div className="evidence-item"><h3>Source Quality</h3><p>Consider the quality and diversity of the evidence supporting each opportunity.</p></div>
            </div>
          </div>
        </section>

        {/* Evidence Trail */}
        <section className="trail">
          <div className="wrap trail-inner">
            <div className="trail-copy">
              <p className="eyebrow">EVIDENCE TRAIL</p>
              <h2>Every Opportunity Has a Trail.</h2>
              <p>Follow a research opportunity back to the papers, concepts, evidence passages, and analytical signals that produced it.</p>
              <Link className="kg-link" to="/evidence">Explore Evidence →</Link>
            </div>
            <div className="trail-panel">
              <h4>Research Opportunity</h4>
              <p className="pair">Multimodal Learning + Robotics</p>
              <div className="trail-stats">
                <div><span>Papers → Multimodal Learning</span><span>112</span></div>
                <div><span>Papers → Robotics</span><span>134</span></div>
                <div><span>Direct combination</span><span>4</span></div>
                <div><span>Semantic Similarity</span><span>0.68</span></div>
                <div><span>Temporal Overlap</span><span>0.79</span></div>
              </div>
              <div className="trail-evidence">
                <div><span>Paper 01</span><span>Future Work — Page 9</span></div>
                <div><span>Paper 02</span><span>Limitation — Page 14</span></div>
                <div><span>Paper 03</span><span>Technical Feasibility — Page 6</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Validation Engine */}
        <section>
          <div className="wrap">
            <div className="validation-header">
              <p className="eyebrow">RESEARCH GAPS VALIDATION</p>
              <h2>Before Calling It a Gap, Try to Disprove It.</h2>
              <p className="section-desc">A candidate opportunity isn't automatically a research gap. IdeaForge challenges its own findings by checking prior work, evidence strength, semantic relevance, feasibility, and contradictory research.</p>
            </div>
            <div className="validation-inner">
              <div className="val-flow">
                <div className="val-flow-step">Candidate Opportunity</div>
                <div className="val-arrow">↓</div>
                <div className="val-flow-step">Prior Art Check</div>
                <div className="val-arrow">↓</div>
                <div className="val-flow-step">Evidence Check</div>
                <div className="val-arrow">↓</div>
                <div className="val-flow-step">Novelty Analysis</div>
                <div className="val-arrow">↓</div>
                <div className="val-flow-step">Feasibility Analysis</div>
                <div className="val-arrow">↓</div>
                <div className="val-flow-step">Contradiction Check</div>
                <div className="val-arrow">↓</div>
                <div className="val-flow-step final">Validated Research Opportunity</div>
              </div>
              <div className="val-result">
                <h4>VALIDATION RESULT</h4>
                <div className="val-checks">
                  <div>Strong semantic relationship</div>
                  <div>Significant temporal overlap</div>
                  <div>Limited direct prior work</div>
                  <div>Multiple independent evidence sources</div>
                  <div>Technically plausible</div>
                </div>
                <div className="val-footer">
                  <div className="val-conf">84%</div>
                  <div className="val-status">VALIDATED OPPORTUNITY</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Temporal */}
        <section className="temporal">
          <div className="wrap">
            <div className="temporal-header">
              <p className="eyebrow">RESEARCH EVOLUTION</p>
              <h2>See How Research Evolves Over Time.</h2>
              <p className="section-desc">Research gaps don't exist in a vacuum. IdeaForge tracks when concepts emerge, grow, intersect, and remain disconnected.</p>
            </div>
            <div className="temporal-panel">
              <div className="timeline-years"><span>2020</span><span>2021</span><span>2022</span><span>2023</span><span>2024</span><span>2025</span></div>
              <div className="timeline-row"><span className="tl-label">Federated Learning</span><div className="tl-bar"></div></div>
              <div className="timeline-row"><span className="tl-label">Differential Privacy</span><div className="tl-bar dim"></div></div>
              <div className="timeline-row"><span className="tl-label">Combined Research</span><div className="tl-bar sparse"></div></div>
              <p className="temporal-note">Two research areas can grow independently for years while their intersection remains largely unexplored.</p>
            </div>
          </div>
        </section>

        {/* Cross-Domain */}
        <section>
          <div className="wrap">
            <div className="crossdomain-header">
              <p className="eyebrow">CROSS-DOMAIN DISCOVERY</p>
              <h2>The Next Breakthrough May Exist Between Fields.</h2>
              <p className="section-desc">Some of the most interesting research opportunities live between established research communities. IdeaForge analyzes connections across domains to uncover potential bridges between fields.</p>
            </div>
            <div className="cross-pairs">
              <div className="cross-pair"><strong>Artificial Intelligence</strong> ↔ Healthcare</div>
              <div className="cross-pair"><strong>Computer Vision</strong> ↔ Agriculture</div>
              <div className="cross-pair"><strong>Robotics</strong> ↔ Neuroscience</div>
              <div className="cross-pair"><strong>Cybersecurity</strong> ↔ Edge Computing</div>
            </div>
            <div className="cross-cta">
              <Link to="/opportunities">Explore Cross-Domain Opportunities →</Link>
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section className="dashboard">
          <div className="wrap">
            <div className="dashboard-header">
              <p className="eyebrow">YOUR RESEARCH LANDSCAPE</p>
              <h2>Your Research Landscape, in One Place.</h2>
            </div>
            <div className="stat-row">
              <div className="stat"><div className="num">247</div><div className="lbl">Papers Analyzed</div></div>
              <div className="stat"><div className="num">1,842</div><div className="lbl">Concepts Discovered</div></div>
              <div className="stat"><div className="num">2,103</div><div className="lbl">Graph Nodes</div></div>
              <div className="stat"><div className="num">87</div><div className="lbl">Potential Opportunities</div></div>
              <div className="stat"><div className="num">12</div><div className="lbl">High-Evidence Opportunities</div></div>
            </div>
            <div className="opps-list">
              <div className="opp-row"><span className="name">Federated Learning + Differential Privacy</span><span className="score">84%</span></div>
              <div className="opp-row"><span className="name">Computer Vision + Edge AI</span><span className="score">79%</span></div>
              <div className="opp-row"><span className="name">Multimodal Learning + Robotics</span><span className="score">76%</span></div>
            </div>
          </div>
        </section>

        {/* Who It's For */}
        <section>
          <div className="wrap">
            <div className="who-header">
              <p className="eyebrow">BUILT FOR RESEARCHERS</p>
              <h2>Built for People Who Ask "What's Next?"</h2>
            </div>
            <div className="who-grid">
              <div className="who-card"><h3>Students</h3><p>Move beyond literature reviews and identify promising directions for projects, theses, and dissertations.</p></div>
              <div className="who-card"><h3>Researchers</h3><p>Explore emerging connections, unresolved problems, and opportunities across the literature.</p></div>
              <div className="who-card"><h3>Research Labs</h3><p>Map research landscapes, identify unexplored intersections, and prioritize promising directions.</p></div>
              <div className="who-card"><h3>Innovation Teams</h3><p>Discover emerging research opportunities that could translate into new technologies and applications.</p></div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="trust" id="trust">
          <div className="wrap">
            <div className="trust-header">
              <p className="eyebrow">EXPLAINABLE BY DESIGN</p>
              <h2>AI Should Help You Investigate — Not Tell You What to Believe.</h2>
              <p className="section-desc">IdeaForge separates analytical evidence from AI-generated explanations. Statistical measurements, graph relationships, and literature evidence form the foundation. AI helps interpret and communicate those findings.</p>
            </div>
            <div className="trust-grid">
              <div className="trust-card"><h3>Evidence First</h3><p>Every opportunity is backed by measurable signals.</p></div>
              <div className="trust-card"><h3>Traceable</h3><p>Follow findings back to their source papers.</p></div>
              <div className="trust-card"><h3>Human in the Loop</h3><p>Researchers make the final judgment.</p></div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="final-cta">
          <div className="final-cta-inner">
            <h2>Your Next Research Question Could Already Be Hiding in the Literature.</h2>
            <div className="hero-buttons">
              <Link className="btn btn-primary" to="/dashboard">Start Exploring →</Link>
              <Link className="btn btn-secondary" to="/papers">Explore Papers</Link>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap footer-inner">
          <div className="footer-brand">
            <div className="logo">IdeaForge</div>
            <p>Discover what research hasn't explored yet.<br />Evidence-driven research discovery.</p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <a href="#discover">Discover</a>
            <Link to="/papers">Papers</Link>
            <Link to="/gaps">Research Gaps</Link>
            <Link to="/opportunities">Opportunities</Link>
            <Link to="/evidence">Evidence Explorer</Link>
          </div>
          <div className="footer-col">
            <h5>Resources</h5>
            <a href="#">Documentation</a>
            <a href="#">Research Methodology</a>
            <a href="#">API</a>
            <a href="#">GitHub</a>
          </div>
          <div className="footer-col">
            <h5>Company</h5>
            <a href="#">About</a>
            <a href="#">Contact</a>
          </div>
        </div>
        <p style={{ textAlign: 'center', paddingBottom: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>© 2026 IdeaForge</p>
      </footer>
    </>
  );
};

export default LandingPage;
