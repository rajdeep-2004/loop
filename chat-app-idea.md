# Campus

## The Idea

**Campus is a university-native communication app that brings students, clubs, schools, and university communities into one place.**

The university already has a social structure — schools, courses, years, classes, clubs, and students. Campus connects that structure with communication.

A student should be able to find **anyone in their university**, discover **communities and clubs**, join conversations, and receive information that is relevant to them.

---

## The University

Every Campus instance belongs to a university.

A university can contain:

- Schools
- Courses / Programs
- Years
- Classes
- Clubs
- Students

For example:

```text
University
│
├── School of Technology
├── School of Psychology
├── School of Design
└── School of Entrepreneurship
```

Every student belongs to a university and is associated with their school, course, year, and class.

This gives every student a university identity inside Campus.

---

## Students

Every student has a profile containing:

- Name
- Username
- Profile picture
- School
- Course / Program
- Year
- Class
- Short bio
- Skills / interests
- Clubs they belong to

Students can discover other students and start a direct conversation with them.

---

## Direct Communication

Students can communicate one-to-one with anyone in their university.

They can:

- Send messages
- Reply to messages
- Edit messages
- Delete messages
- React to messages
- Share images
- Share files
- See basic message status
- See basic online presence
- See when someone is typing

---

## Group Chats

Students can create and participate in group chats.

A group has:

- Name
- Description
- Banner / profile image
- Members
- Admins
- Private conversation

Group members can communicate, share media, reply to messages, react to messages, and view the other members of the group.

---

# Clubs & Communities

Clubs are the main community layer of Campus.

Examples:

- Dev Club
- AI Club
- Product Club
- Photography Club
- Entrepreneurship Club
- Sports Club

A club is **more than a group chat**.

Every club has a **public presence** and a **private communication space**.

---

## Public Club Page

Anyone in the university can discover and view a club's public page.

The page contains:

- Club name
- Club banner
- Club description
- What the club does
- What the club is currently working on
- Upcoming activity / event
- Public announcements
- Number of members
- Member list

For example:

```text
Dev Club

Building the developer community
at the university.

Currently working on:
Blackbox 2.0

Next:
Open Source Night — Friday, 6 PM

87 Members

[Join Club]
```

The public page lets students understand what a club is about before joining it.

---

## Club Members

Students can view the members of a club.

A member's profile can be opened directly from the club.

From there:

**Club → Member → Profile → Direct Message**

This makes clubs a natural way for students to discover and connect with other people.

---

## Club Membership

A student can join a club from its public page.

After joining:

- The club becomes part of their communities.
- They can access the private club chat.
- They become visible in the club's member list.
- They can participate in club conversations.

Students can also leave clubs.

---

## Private Club Chat

Every club has a private chat available only to its members.

The club chat is used for:

- Discussions
- Coordination
- Sharing resources
- Planning activities
- Asking questions
- Internal communication

The public club page and private club chat remain separate.

The public page tells everyone **what the club is**.

The private chat is where **club members communicate**.

---

## Club Roles

Clubs have simple roles:

- Owner
- Admin
- Member

Club admins can manage the club's basic information, members, and announcements.

---

# University & Club Announcements

Campus allows the university and clubs to communicate with specific groups of students.

Announcements can be targeted to:

- Entire university
- Specific school
- Specific year
- Specific class / program

For example:

```text
Dev Club

AI Workshop this Friday at 6 PM.

Audience:
School of Technology
2nd & 3rd Year
```

Or:

```text
University

Mid-semester examination schedule
has been released.

Audience:
Entire University
```

The idea is simple:

> **Send information to the people it is actually relevant to.**

This does not need to become a complicated notification system. Announcements are simply another communication layer within Campus.

---

# Discover

Discover allows students to explore their university.

Students can discover:

### People

Find students by:

- Name
- Username
- School
- Course
- Year
- Skills / interests

### Clubs

Browse and search university clubs.

### Schools

Explore the different schools within the university.

Discover should make it easy to answer questions like:

> Who is in the Dev Club?

> What clubs exist in my university?

> Who studies in my school?

> Who is interested in AI?

> Who can I connect with?

---

# Media & Conversations

Campus conversations support:

- Text
- Images
- Files
- Replies
- Reactions
- Message threads

Threads allow a specific message to have its own conversation without cluttering the main group chat.

For example:

```text
Rajdeep:
Who is joining the hackathon?

💬 12 replies
```

---

# The Campus Structure

Everything in Campus connects through the university.

```text
                        UNIVERSITY
                            │
             ┌──────────────┼──────────────┐
             │              │              │
          SCHOOLS         CLUBS         STUDENTS
             │              │              │
        Years / Classes     │           Profiles
                            │              │
                    ┌───────┴───────┐      │
                    │               │      │
               Public Page     Private Chat │
                    │               │      │
              Description          Members   │
              Activity             Messages  │
              Events               Media     │
              Announcements                  │
                                             │
                         ┌───────────────────┘
                         │
                    Direct Chat
```

A student can move naturally through this structure:

**Discover a club**

→ **View its public page**

→ **See its members**

→ **Join the club**

→ **Enter the private club chat**

→ **Discover other students**

→ **Message them directly**

→ **Receive relevant announcements**

---

# The Core Idea

Campus is built around one simple principle:

> **A university already has a social network. Campus gives that network a communication layer.**

Students have identities.

Schools organize students.

Clubs bring students together.

Club pages make communities discoverable.

Private chats let members communicate.

Direct messaging connects individuals.

Announcements let universities and clubs communicate with the people who actually need to know.

---

# Campus V1

The first version focuses on:

- Student identity
- Direct messaging
- Group chats
- University structure
- Clubs
- Public club pages
- Club membership
- Private club chats
- Club members
- Discover
- Media sharing
- Threads
- Targeted announcements

The goal is **not** to build an all-in-one university platform.

The goal is to build a **real communication layer for university life**.

> **Campus — your university, your people, your communities, your conversations.**