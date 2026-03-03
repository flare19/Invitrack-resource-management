## ADR-001: Adopt Modular Monolith Architecture

Date: 2026-03-03

Decision:
The system will be implemented using a modular monolith architecture. 
It will be deployed as a single application, but internally divided 
into well-defined modules with strict boundaries and ownership rules.

Reasoning:
- The project is developed by a single engineer with a 2-month timeline.
- Microservices would introduce unnecessary operational and deployment complexity.
- A modular monolith allows strong separation of concerns while maintaining
  simplicity in deployment and debugging.
- Clear module boundaries make future extraction into microservices possible
  if the system scales.
- Enables enforcement of domain ownership (each module owns its own data and logic).

Tradeoffs:
- All modules share a single runtime and database.
- Requires discipline to avoid cross-module coupling.
- Scaling is vertical rather than horizontal at the architecture level.