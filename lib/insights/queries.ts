// Database queries for signal scores and behaviour deltas

// Query to fetch signal scores
const fetchSignalScores = `SELECT * FROM signal_scores WHERE date >= ? AND date <= ?`;

// Query to fetch behaviour deltas
const fetchBehaviourDeltas = `SELECT * FROM behaviour_deltas WHERE delta_date >= ? AND delta_date <= ?`;