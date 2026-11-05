# Lab Scheduler Pro

Build a Biomechanical Testing Laboratory Project & Machine Planning App

I want to replace an existing Excel-based project and machine occupancy planning system with a modern, intuitive web application.

The attached Excel file represents the current planning logic and should be treated as the starting point for the data model and workflow.

The application is for a biomechanical testing laboratory where multiple projects need to be planned, scheduled and assigned to testing machines.

Main objective

Make it extremely fast and intuitive for a laboratory/project manager to answer:

What projects are coming up?

Which machines are occupied?

When is each machine available?

Which projects are competing for the same machine?

Where are there gaps in machine utilization?

Which projects are not yet scheduled?

Can I move a project to another date or machine?

What is the overall workload for the next few weeks/months?

The application should feel more like a modern resource planning / Gantt scheduling tool than an Excel spreadsheet.

Existing Excel data model

The current Excel contains fields similar to:

Nr.

Opportunity Code

Quote

Project

Customer

Title

Price

Responsible

Start Date

End Date

Working Days

Machine

Status

Tag

The current machine examples include machines such as:

S1

The current statuses include:

In preparation

Can be started

Currently running

There is also a calendar view showing machine/project occupancy by day/week.

Do not simply reproduce the Excel sheet. Use the information to create a much better workflow.

Core application structure

Create the application around four main views:

1. Planning / Schedule

This should be the primary screen.

Create a horizontal timeline similar to a Gantt chart.

Rows should represent machines.

For example:

S1
S2
S3
S4
...

Projects should appear as draggable blocks on the corresponding machine row.

Each project block should show:

Project name

Customer

Responsible person

Start date

End date

Status

Use different visual styling for different statuses.

Users should be able to:

Drag a project horizontally to change its dates

Drag a project vertically to another machine

Resize the left/right edge to change duration

Click a project to open its details

Create a new project directly from the timeline

Zoom between day/week/month views

Navigate forward/backward in time

The timeline should automatically detect and clearly show machine conflicts.

2. Project list

Create a clean table/list of all projects.

Columns:

Project

Customer

Opportunity

Responsible

Machine

Start

End

Working days

Status

Priority

Utilization / planning state

Provide:

Search

Filters

Sorting

Status filters

Machine filters

Responsible-person filters

Date filters

A user should be able to quickly find all projects that are:

Not scheduled

Currently running

Ready to start

Delayed

Completed

3. Project detail

Clicking a project should open a side panel or detail page.

Show:

General information

Project number

Opportunity code

Quote

Customer

Project name

Test title

Price

Responsible person

Planning

Status

Priority

Start date

End date

Working days

Assigned machine

Planning actions

Provide prominent actions:

Schedule project

Change machine

Move dates

Duplicate project

Mark as completed

Mark as delayed

The user should be able to modify planning information without navigating through multiple screens.

4. Dashboard

Create a management dashboard showing the current state of the laboratory.

Include:

Machine utilization

For each machine:

Current status

Current project

Utilization percentage

Next available date

Number of planned projects

Example:

S1
Currently occupied
Project: ASTM F1875
Available: 12 September
Utilization: 84%

Key KPIs

Show:

Total active projects

Projects currently running

Projects ready to start

Unscheduled projects

Machines currently occupied

Machine utilization %

Available machine capacity

Projects at risk

Planning warnings

Create an "Attention required" section.

Examples:

Machine conflict detected

Project has no machine assigned

Project has no start date

Project deadline is approaching

Machine has a long unused gap

Project is overdue

Important UX concept: "Unscheduled projects"

Create a dedicated area/sidebar for projects that are not yet scheduled.

For example:

UNSCHEDULED

Project ABC
Customer XYZ
5 working days
Required machine: S1
Priority: High

The user should be able to drag this project directly onto a machine and date in the schedule.

This should be one of the fastest workflows in the application.

Machine availability

When scheduling a project, automatically calculate available machine capacity.

If a project requires S1 for 5 working days, the interface should make it obvious where the next 5-day free slot exists.

Ideally provide a scheduling assistant:

"Find earliest available slot"

and show:

S1 → 18–24 September
S2 → 15–21 September
S3 → 12–18 September

The user can then select one of the suggested slots.

Conflict detection

The application must prevent or strongly warn about overlapping projects on the same machine.

If a user tries to schedule:

Project A: S1, 10–15 September

and

Project B: S1, 12–18 September

show a clear conflict warning.

Do not silently allow conflicts.

Provide options:

Move project

Select another machine

Keep conflict anyway, if authorized

Smart scheduling

Where possible, introduce intelligent planning suggestions.

For each unscheduled project calculate:

Required machine

Duration

Earliest possible start

Next available machine slot

Priority

Deadline

Suggest the best available slot.

The scheduling algorithm should try to:

Avoid conflicts

Respect project deadlines

Prioritize high-priority projects

Minimize unnecessary machine idle time

Keep projects on their preferred machine where possible

Highlight scheduling risks

Do not make the application overly complicated. The user should remain in control.

Calendar controls

Provide:

Day view

Week view

Month view

3-month planning view

The default should probably be Week or Month, because this is a laboratory capacity planning application rather than an appointment calendar.

Include:

Today button

Previous/next period

Current date indicator

Zoom control

Visual design

The interface should be modern, professional and suitable for a technical/scientific laboratory.

Avoid making it look like a generic CRM.

Prioritize:

High information density

Excellent readability

Clear hierarchy

Minimal clicks

Strong visual distinction between planned, running, completed and problematic projects

Use a restrained professional color palette.

Use color primarily for:

Project status

Conflicts

Warnings

Machine utilization

Do not use excessive colors.

Important interaction principles

The most common operations should require very few clicks.

For example:

Schedule a project

Drag project → machine row → desired date.

Change dates

Drag project block.

Change duration

Resize project block.

Change machine

Drag project vertically.

Edit project

Click project → side panel.

Find machine availability

Click "Find available slot".

Data integrity

Do not allow users to accidentally overwrite important information.

Use confirmations for destructive actions.

Dates must be stored as actual date values.

Working days should be calculated automatically from start/end dates rather than manually entered wherever possible.

Support weekends and configurable laboratory working days/holidays.

Import / export

The application should support:

Importing the existing Excel structure

Exporting the current schedule to Excel

Exporting/printing a planning overview

The imported Excel data should become the initial dataset.

Responsive design

The primary experience is desktop because this is a laboratory planning tool.

However, the interface should still work on tablets.

Mobile does not need to have the full scheduling experience.

Technical expectations

Build this as a real functional application, not a static mockup.

Use a proper relational data model.

Core entities should include approximately:

Projects

Customers

Employees / Responsible persons

Machines

Machine bookings

Statuses

Priorities

Working calendars / holidays

Keep the architecture extensible so additional machines, statuses and fields can be added later.

First version priorities

Prioritize these features first:

Machine timeline / Gantt schedule

Project creation/editing

Drag-and-drop scheduling

Conflict detection

Unscheduled project list

Machine availability

Project filtering/search

Dashboard with utilization

Excel import/export

Do not spend excessive time on secondary features before these workflows are excellent.

Success criterion

The application should make a user feel:

"I can understand the entire laboratory capacity situation in 10 seconds, and I can schedule or move a project in a few seconds."

The application should be significantly faster and more intuitive than the existing Excel spreadsheet.

Start by creating the main scheduling interface with realistic sample data based on the provided Excel structure.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/917305cb-46f2-425e-ba12-04dd46728311).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
