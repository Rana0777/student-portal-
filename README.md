## Student Result Portal (Mini)

A lightweight, single-page web app to add students, enter subject-wise marks, and automatically compute total, percentage, and grade. Data is saved to your browser via localStorage — no backend required.

### Features

- **Add/Edit Students**: Name, roll number, and any number of subjects.
- **Validation**: Inline errors and unique roll number enforcement.
- **Automatic Calculation**: Total, percentage, and grade (A+ to F).
- **View/Print**: See subject-wise marks in a modal or print a student.
- **Search & Sort**: Search by name or roll; sort by percentage, name, or recency.
- **Export/Import**: Backup/restore data as JSON; download consolidated CSV.
- **Local Persistence**: Data survives page refresh using `localStorage`.
- **Responsive & Accessible**: Keyboard shortcuts and ARIA-friendly dialogs.
 - **Theme Toggle**: Light/Dark with persistence.
 - **Pagination & Stats**: Page through results and see count with average %.

### Getting Started

1. Download or clone this folder `student_result_portal` onto your machine.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
   - On Windows, you can double-click `index.html` to launch.

No installation or server is needed.

### Usage

1. Fill in the student name and roll number.
2. Add one or more subjects with marks (0–100). Use “+ Add Subject” as needed.
3. Click “Save” to add a student. The app computes totals, percentage, and grade.
4. Use the table to:
   - **View**: Open a modal with subject-wise breakdown.
   - **Edit**: Load data back into the form for updating.
   - **Delete**: Remove the student from the list.
5. Use the search box to filter by name or roll; adjust the sort dropdown as needed.
6. Use the toolbar buttons to Export (JSON), Import (JSON), download CSV, or Clear all data.
7. Toggle theme from the header. Adjust page size from the toolbar; use pagination controls below the table.

### Grading Scale

```
>= 90 : A+
>= 80 : A
>= 70 : B+
>= 60 : B
>= 50 : C
>= 40 : D
<  40 : F
```

### Data Model

Each student is stored like this in `localStorage` under the key `srp_students_v1`:

```json
{
  "id": "string",
  "name": "string",
  "roll": "string",
  "subjects": [{ "name": "string", "marks": number }],
  "total": number,
  "percentage": number,
  "grade": "A+|A|B+|B|C|D|F",
  "createdAt": 1710000000000
}
```

### Notes

- Marks are bounded to 0–100 when saving.
- Roll numbers are unique. Import merges by roll (existing wins on id/timestamps).
- Deleting a student is permanent (within the browser). There is no undo.
- To start fresh, clear your browser storage for this site.

### License

MIT


