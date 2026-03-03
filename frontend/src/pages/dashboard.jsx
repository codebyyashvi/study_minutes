import React from "react";
import { Plus, Mic, FileText } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      
      {/* Main Content */}
      <div className="p-8">

        {/* Welcome Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold">
            Welcome back 👋
          </h1>
          <p className="text-slate-400 mt-2">
            Ready to revise smarter with AI?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">

          {/* Add Note */}
          <button className="bg-slate-800 hover:bg-slate-700 transition rounded-2xl p-6 text-left border border-slate-700 hover:border-blue-500 group">
            <Plus className="text-blue-500 group-hover:scale-110 transition mb-4" size={28} />
            <h2 className="text-lg font-medium">Add New Note</h2>
            <p className="text-slate-400 text-sm mt-1">
              Write or paste your important study notes
            </p>
          </button>

          {/* Upload Audio */}
          <button className="bg-slate-800 hover:bg-slate-700 transition rounded-2xl p-6 text-left border border-slate-700 hover:border-blue-500 group">
            <Mic className="text-blue-500 group-hover:scale-110 transition mb-4" size={28} />
            <h2 className="text-lg font-medium">Upload Audio</h2>
            <p className="text-slate-400 text-sm mt-1">
              Convert lecture recordings into structured notes
            </p>
          </button>

          {/* Upload PDF */}
          <button className="bg-slate-800 hover:bg-slate-700 transition rounded-2xl p-6 text-left border border-slate-700 hover:border-blue-500 group">
            <FileText className="text-blue-500 group-hover:scale-110 transition mb-4" size={28} />
            <h2 className="text-lg font-medium">Upload PDF</h2>
            <p className="text-slate-400 text-sm mt-1">
              Extract key concepts from PDF notes
            </p>
          </button>

        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-4 gap-6">

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 transition">
            <p className="text-slate-400 text-sm">Total Notes</p>
            <h2 className="text-2xl font-semibold mt-2">24</h2>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 transition">
            <p className="text-slate-400 text-sm">Subjects</p>
            <h2 className="text-2xl font-semibold mt-2">6</h2>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 transition">
            <p className="text-slate-400 text-sm">Important Topics</p>
            <h2 className="text-2xl font-semibold mt-2">15</h2>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 transition">
            <p className="text-slate-400 text-sm">Recent Uploads</p>
            <h2 className="text-2xl font-semibold mt-2">4</h2>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;