# Product Requirements

> Status: approved (design doc approved 2026-11-15) — Last updated: 2026-11-15
> Sources: /office-hours design doc `docs/designs/campus-v1.md` (see decisions.md D-001). Feature brief: `chat-app-idea.md`.

## 1. Problem
University life runs on tools that know nothing about the university. Students sit in dozens of
WhatsApp groups, clubs live on Instagram pages and invite links, and official notices arrive by
email to everyone or to nobody. As a result a student cannot easily find people ("who in 3rd year
is interested in AI?"), cannot see what a club does or who is in it before joining, and receives
announcements that are either irrelevant or never arrive. Campus is a mobile chat app tied to the
university's own structure (schools, programs, years, classes, clubs), so that people, clubs and
announcements are discoverable and addressable through that structure.

## 2. Users
| User / actor | What they need | How often |
|---|---|---|
| Student | Find and message other students, discover and join clubs, chat in groups and clubs, receive announcements relevant to their school, year and class | Daily |
| Club owner / admin | Keep the club's public page current, manage members, post announcements to a chosen audience | Weekly |
| University admin | Post official announcements to the whole university or to a school, year or class | Weekly |

## 3. Goals
- Every item in the idea doc's "Campus V1" list works.
- The two core flows below run end to end.
- A targeted announcement reaches only the students in its audience, live.
- The UI is distinctive (neo-brutalist, see `DESIGN.md`), not a generic chat template.

## 4. Non-goals
- Scalability. One server process, one database. No Redis, no background workers.
- Multiple universities. One seeded university instance.
- University SSO or student ID verification.
- Push notifications. Messages and announcements arrive in-app in realtime only.
- A web client, and App Store or Play Store releases.

## 5. Features
### Must have (v1)
| ID | Feature | Acceptance criteria |
|---|---|---|
| F-01 | Student identity | A student can sign up, log in, log out, complete onboarding (school, program, year, class) and edit a profile with name, username, picture, bio, skills and interests |
| F-02 | University structure | Schools, programs, years and class sections exist as seeded data and every student is attached to them |
| F-03 | Direct messaging | Two students can exchange text messages in realtime; history pages; sent and read status, online presence and typing indicator are shown |
| F-04 | Message actions | A sender can edit and delete own messages; any member can reply to and react to a message |
| F-05 | Group chats | A student can create a group with name, description and image; admins manage members and admins; members can see the member list |
| F-06 | Clubs and public pages | Any student can browse clubs and open a public page showing name, banner, description, what the club does, current work, next event, announcements, member count and member list |
| F-07 | Club membership and roles | A student can join and leave a club; owner, admin and member roles exist; owners and admins edit the page and manage members |
| F-08 | Private club chat | Only members can read and write in a club's chat |
| F-09 | Club members to DM | From a club's member list a student can open a profile and start a direct message |
| F-10 | Targeted announcements | The university admin and club owners/admins can post announcements targeted by school, year and program/class; only matching students see them, live and in their feed |
| F-11 | Discover | A student can search people by name, username, school, program, year, skills and interests, browse and search clubs, and explore schools |
| F-12 | Media sharing | Images and files can be sent in any chat, with type and size limits; private chat attachments are readable only by conversation members |
| F-13 | Threads | A message in a group or club chat can have its own thread, shown as "N replies" on the root message |

### Later / maybe
- Announcement reach preview ("reaches 412 students") and seen-rate ("seen by 71%"). Parked in `TODOS.md`.

## 6. Core user flows
### Flow 1: The club walk
1. Student opens Discover and finds a club.
2. Opens the club's public page and reads what it does and who is in it.
3. Joins the club and lands in the private club chat.
4. Sends a message and replies in a thread.
5. Opens a member's profile from the member list and sends a direct message with an image.

### Flow 2: Targeted announcement
1. A club admin writes an announcement and picks the audience "School of Technology, years 2 and 3".
2. A 2nd-year technology student sees it appear live and in the announcements feed.
3. A student from another school or year does not receive it.

## 7. Constraints
- Deadline: about 6 to 8 weeks, solo builder.
- Scale (users, requests, data size): demo scale; a few hundred seeded students.
- Platform / hosting: mobile app (Expo, React Native). Backend runs locally (see architecture.md §0).
- Budget / free-tier limits: free tiers only.
- Compliance / privacy: prototype with seeded data; private chats and their attachments are readable by members only.

## 8. Success metrics
- 13 of 13 V1 features pass their acceptance criteria.
- Both core flows complete in one run without a restart.
- Lint, typecheck and tests pass on every milestone.

## 9. Milestones
| ID | Milestone | Features | Status | PR |
|---|---|---|---|---|
| M1 | Foundation and identity (repo layout, design system, auth, onboarding, profile, image upload, seed script) | F-01, F-02 | shipped | merged to main |
| M2 | Direct messaging | F-03 | shipped | merged to main |
| M3 | Message actions | F-04 | building | |
| M4 | Group chats | F-05 | todo | |
| M5 | Clubs | F-06, F-07, F-08, F-09 | todo | |
| M6 | Announcements | F-10 | todo | |
| M7 | Discover | F-11 | todo | |
| M8 | Chat media, threads and demo polish (attachments, threads, demo data pass) | F-12, F-13 | todo | |

## 10. Open questions
| # | Question | Owner | Resolved? |
|---|---|---|---|
| 1 | Where does the backend run on demo day (laptop on Wi-Fi or a free host)? | Rajdeep | Assumed laptop (D-002) |
| 2 | Who can create a club? Assumed: any student, who becomes owner | Rajdeep | Assumed |
| 3 | What is a "class"? Assumed: a section label within a program and year | Rajdeep | Assumed |
| 4 | Do threads exist in DMs? Assumed: no | Rajdeep | Assumed |
| 5 | Limit signup to a university email domain? Assumed: no | Rajdeep | Assumed |
| 6 | Product name "Campus" vs repo name "loop" | Rajdeep | No |
| 7 | Visual style: "Bootlegism" read as neo-brutalism | Rajdeep | Assumed (D-003) |
