# Veersa-DeGen: AI-Powered Telehealth Platform

**Veersa-DeGen** is a modern, full stack telehealth application. It connects patients with doctors, offering a seamless experience from booking and payment to live video consultations and AI-powered medical assistance.

**Live Demo Link - https://veersa-de-gen.vercel.app**

## 🚀 Core Features

  * **Role-Based Authentication:** Separate sign-up and login flows for Patients and Doctors, managed via Supabase Auth.
  * **Detailed User Profiles:** Customized profile setup for both patients (medical history, vitals, allergies) and doctors (specialization, experience, consultation fees, available time slots).
  * **Appointment Management:** Patients can book available slots with doctors. Doctors can manage their schedules by confirming, canceling, or completing appointments.
  * **Payment Integration:** A built in payment flow triggers an update to the appointment status from "pending" to "paid," enabling the consultation.
  * **Real-time Video Consultations:** Secure, peer-to-peer video calls powered by WebRTC. Supabase Realtime channels are used to broadcast signaling messages (offers, answers, and ICE candidates) between the two participants.
  * **Secure Medical Record Uploads:** Patients can upload their medical documents (PDFs, images) to their secure profile via Supabase Storage. This upload triggers an Edge Function (`process-document`) for analysis.
  * **AI Medical Assistant (RAG):** A smart chatbot for patients, connected to their user account. This feature uses a **Retrieval-Augmented Generation (RAG)** pipeline: when a document is uploaded, an Edge Function generates vector embeddings and stores them. When a patient asks a question in the chat, the `patient-chat` function retrieves the most relevant text from *their* documents via vector search and feeds it to an LLM as context. This ensures the AI provides grounded answers based *only* on their personal health data.
  * **Live Transcription & Summarization (Planned):** Integrates Deepgram for real-time, live speech-to-text transcription during video calls, with an AI-powered summary saved after the consultation.
    
## 📸 Snapshots

### Login & SignUp
<p align="center">
  <img src="https://github.com/user-attachments/assets/db453287-cb65-4956-8e83-235ccdb9f6bb" width="45%" />
   <img src="https://github.com/user-attachments/assets/eea7aa3d-76a0-4407-839e-e59b164f2aea" width="45%" />
</p>

### Patient Dashboard

<img width="1431" height="808" alt="Patient_dashboard" src="https://github.com/user-attachments/assets/ebfd6e06-b921-4967-8fdd-b330f1a8367d" />

### Book Appointments & Payment 


<p align="center">
  <img src="https://github.com/user-attachments/assets/3acb7486-83d1-4491-95d3-96225da71adc" width="33%" />
  <img src="https://github.com/user-attachments/assets/1bcb63fb-802e-4273-b324-47c0f78e103c" width="33%" />
  <img src="https://github.com/user-attachments/assets/35ea097d-9ca2-464a-9929-fca3b80619a4" width="33%" height="380px" />
</p>

### Dashboard Updated

<img width="1428" height="801" alt="Dashboard_patient" src="https://github.com/user-attachments/assets/83b326b6-2883-421f-ba10-3ca7a3e3cae4" />

### Medical Reports

<img width="990" height="518" alt="Medical_Reports" src="https://github.com/user-attachments/assets/e2db0136-ccaf-4ceb-ba72-af5ede0d5029" />

### AI Chat Assistant

<img width="1152" height="658" alt="AI_chat_assitant" src="https://github.com/user-attachments/assets/1e030db1-5a82-45c7-9d4b-b0d89b572405" />

### Doctors Dashboard
<p align="center">
  <img src="https://github.com/user-attachments/assets/1ea1dba1-0204-4ea0-9042-6cd93b918b58" width="45%" height="250px" />
  <img src="https://github.com/user-attachments/assets/41bce5ad-85ae-40a8-9797-e14e8bc135cf" width="45%" height="250px" />
</p> 

### Video Call 

<img width="541" height="534" alt="Video_call_demo" src="https://github.com/user-attachments/assets/6f82a688-712e-43fb-8a67-5bf97eaf3056" />


## 🛠️ Tech Stack

This project leverages a modern, serverless-first tech stack for rapid development and scalability.

### Frontend

  * **Framework:** [React](https://react.dev/)
  * **Build Tool:** [Vite](https://vitejs.dev/)
  * **Routing:** [React Router v7](https://reactrouter.com/)
  * **State Management:** React Context API (for Authentication)
  * **Notifications:** [React Hot Toast](https://react-hot-toast.com/)
  * **Styling:** Plain CSS

### Backend & Services (Supabase)

  * **Core Backend:** [Supabase](https://supabase.com/)
  * **Authentication:** [Supabase Auth](https://supabase.com/auth) (handles user login, sign-up, and row-level security).
  * **Database:** [Supabase Postgres](https://supabase.com/database) (stores all `users`, `doctor_profiles`, `patient_profiles`, `appointments`, `medical_documents`, and `ai_chat_logs`).
  * **Real-time:** [Supabase Realtime](https://supabase.com/realtime) (used to broadcast WebRTC signaling messages for the video calls).
  * **Storage:** [Supabase Storage](https://supabase.com/storage) (securely stores all uploaded `patient_records`).
  * **Serverless Functions:** [Supabase Edge Functions](https://supabase.com/edge-functions) (used to power the `patient-chat` AI assistant and `process-document` on upload).
    

### Other Technologies

  * **Video/Audio:** [WebRTC](https://webrtc.org/) (provides the peer-to-peer connection for video calls).
  * **Payments:** [Square SDK](https://developer.squareup.com/docs/web-payments/overview) (integrated for handling payments, currently in test mode).
  * **[Deepgram](https://deepgram.com/)**: For live speech-to-text transcription and summarization.

## ⚙️ How It Works: The User Flow

1.  **Sign Up:** A user chooses to sign up as either a "Patient" or a "Doctor".
2.  **Profile Setup:** After email confirmation, the user is redirected to a mandatory profile setup page specific to their role.
3.  **Booking (Patient):** The patient browses doctors and books an available time slot.
4.  **Payment (Patient):** The appointment is created with a `pending` status. The patient must complete the payment (using the mock payment page) to update the status to `paid`.
5.  **Confirmation (Doctor):** The doctor sees the paid, pending appointment on their dashboard and can "Confirm" it.
6.  **Upload Records (Patient):** Before the call, the patient can upload their medical history, lab reports, etc., via the "Medical Records" page.
7.  **AI Chat (Patient):** The patient can use the "AI Assistant" to ask questions. This feature securely calls a Supabase Edge Function to get context-aware answers.
8.  **Join Call:** At the scheduled time, a "Join Video Call" button becomes active for both users on their dashboards (contingent on `status: "confirmed"` and `payment_status: "paid"`).
9.  **Video Call:** Clicking the button launches the peer-to-peer WebRTC video consultation, using Supabase Realtime for signaling.
10. **Completion:** After the call, the doctor can mark the appointment as "Completed" from their dashboard.

## 📦 Getting Started (Local Setup)

To run this frontend locally:

1.  **Clone the repository:**

    ```sh
    git clone https://github.com/your-username/veersa-degen.git
    cd veersa-degen/frontend
    ```

2.  **Install dependencies:**

    ```sh
    npm install
    ```
    
3.  **Set up your environment:**

      * Create a Supabase project.
      * Inside your Supabase project, you will need to set up the database tables (`users`, `doctor_profiles`, `patient_profiles`, `appointments`, `medical_documents`, `ai_chat_logs`), Storage buckets (`patient_records`), and Edge Functions (`patient-chat`, `process-document`).
      * Rename `env.example` to `.env`.
      * Add your Supabase Project URL and Anon Key to the `.env` file:
        ```.env
        VITE_SUPABASE_URL=https://your-project-id.supabase.co
        VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
        VITE_SQUARE_APPLICATION_ID=your-id
        VITE_SQUARE_LOCATION_ID=your-id
        ```

4.  **Run the development server:**

    ```sh
    npm run dev
    ```

5.  Open [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173) (or your specified port) in your browser to see the working application.
