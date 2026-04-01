## Plan

### 1. Structured sport types
- Add a predefined list of sports (running, swimming, football, gym, cycling, etc.) as a constant
- Update AddView form to use a dropdown instead of free-text for training type
- Keep "Muu" (Other) option with free-text fallback

### 2. Training editing
- Create an EditTrainingDialog component
- Allow editing all fields: sport, date, duration, notes, visibility, effort/heart rate
- Add edit button to TrainingCard in both HomeView and ArchiveView

### 3. Period-level editing on home page
- On home page, periods show as collapsed cards with period-level actions only
- Actions: edit period (name, dates, visibility), delete period
- Individual trainings within a period are NOT editable from home page
- In archive, individual trainings within periods CAN be edited

### 4. Unified sorting of periods and single trainings
- Treat periods as single items using their start_date for sorting
- Merge periods and single trainings into one sorted list
- Apply filters to both

### 5. Tooltips
- Add info icons next to visibility, effort/heart rate, period sections
- Use shadcn Tooltip component

### 6. PDF export
- Add a "PDF" button that generates a downloadable PDF of trainings
- Use browser-side PDF generation (jspdf)

### 7. UI cleanup
- Ensure everything fits the existing design system
