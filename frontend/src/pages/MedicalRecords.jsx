import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css'; // Re-using dashboard styles for consistency

export default function MedicalRecords() {
  const { user, userProfile } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get the correct patient ID from the nested profile object
  const patientProfileId = userProfile?.profile?.id;

  useEffect(() => {
    if (patientProfileId) {
      fetchDocuments();
    } else {
      // Don't try to fetch if the profile isn't loaded
      setLoading(false);
    }
  }, [patientProfileId]); // Depend directly on the ID

  async function fetchDocuments() {
    try {
      setLoading(true);
      if (!patientProfileId) return; // Guard clause

      const { data, error } = await supabase
        .from('medical_documents')
        .select('*')
        .eq('patient_id', patientProfileId) // <-- CORRECTED
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event) {
    // Critical check: Ensure we have the user and their profile ID
    if (!patientProfileId || !user?.id) {
      alert('Error: Profile is not fully loaded. Please refresh and try again.');
      return;
    }

    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`; // Uses auth user ID for folder
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('patient_records')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Insert record into database
      const { data: docData, error: dbError } = await supabase
        .from('medical_documents')
        .insert([
          {
            patient_id: patientProfileId, // <-- CORRECTED
            file_name: file.name,
            file_url: filePath,
            document_type: file.type,
            processing_status: 'pending'
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Trigger the Edge Function
      console.log('⚡ triggering process-document for:', docData.id);
      supabase.functions.invoke('process-document', {
        body: { document_id: docData.id }
      }).then(({ data, error }) => {
          if (error) console.error('Edge function error:', error);
          else console.log('Edge function response:', data);
          fetchDocuments(); // Refresh list
      });

      // Refresh immediately to show the new 'pending' document
      fetchDocuments();

    } catch (error) {
      console.error('Error during upload:', error);
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  // Helper to render the main content
  const renderContent = () => {
    if (loading) {
      return <p>Loading records...</p>;
    }
    if (!patientProfileId) {
      return <p>Loading user profile...</p>;
    }
    if (documents.length === 0) {
      return <p>No medical records uploaded yet.</p>;
    }
    return (
      <table className="appointments-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>File Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id}>
              {/* Use 'created_at' from your schema, not 'uploaded_at' unless you prefer it */}
              <td>{new Date(doc.created_at).toLocaleDateString()}</td>
              <td>{doc.file_name}</td>
              <td>
                <span className={`status-badge status-${doc.processing_status}`}>
                  {doc.processing_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        {/* ... your sidebar nav ... */}
        <nav className="sidebar-nav">
          <a href="/dashboard">Dashboard</a>
          <a href="/medical-records" className="active">Medical Records</a>
          <a href="/patient-chat">AI Assistant</a>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>My Medical Records</h1>
        </header>

        <div className="dashboard-content">
          {/* Upload Section */}
          <div className="card">
             <h3>Upload New Record</h3>
             <p>Upload your medical reports (PDF, JPG, PNG) for AI analysis.</p>
             <input
               type="file"
               accept=".pdf,image/png,image/jpeg"
               onChange={handleFileUpload}
               disabled={uploading || loading || !patientProfileId} // Disable if not ready
             />
             {uploading && <p>Uploading... please wait.</p>}
          </div>

          {/* Document List */}
          <div className="card">
            <h3>Uploaded Documents</h3>
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}