import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Trash2,
  Briefcase,
  Folder,
  Image,
  FileText,
  Music,
  Video,
  ArrowLeft,
} from "lucide-react";
import useUserStore from "../../store/userStore";
import toast from "react-hot-toast";

const Bin = () => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedItems, setSelectedItems] = useState({
    files: [],
    folders: [],
  });
  const [isDeleteForeverModalOpen, setIsDeleteForeverModalOpen] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user, token, clearUser } = useUserStore();
  const navigate = useNavigate();
  const deleteModalRef = useRef(null);

  const endpoint = "https://cryogena-backend.onrender.com/graphql/";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Fetch bin contents
  const fetchBinContents = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: `
            query {
              binContents {
                files { id name ownerAvatar createdAt size fileType fileUrl }
                folders { id name createdAt }
              }
            }
          `,
        }),
      });
      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);
      setFiles(data.binContents.files);
      setFolders(data.binContents.folders);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !token) {
      navigate("/login");
      return;
    }
    fetchBinContents();
  }, [user, token, navigate]);

  // Close delete forever modal on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (deleteModalRef.current?.contains(e.target)) {
        return;
      }
      setIsDeleteForeverModalOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Handle item selection
  const handleSelectItem = (type, id) => {
    setSelectedItems((prev) => {
      const items = prev[type].includes(id)
        ? prev[type].filter((itemId) => itemId !== id)
        : [...prev[type], id];
      return { ...prev, [type]: items };
    });
  };

  // Delete forever
  const handleDeleteForever = async () => {
    setLoading(true);
    try {
      // Delete selected files
      for (const fileId of selectedItems.files) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `
              mutation ($fileId: ID!) {
                deleteFileForever(fileId: $fileId) {
                  success
                  message
                }
              }
            `,
            variables: { fileId },
          }),
        });
        const { data, errors } = await response.json();
        if (errors) throw new Error(errors[0].message);
        if (!data.deleteFileForever.success)
          throw new Error(data.deleteFileForever.message);
      }

      // Delete selected folders
      for (const folderId of selectedItems.folders) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `
              mutation ($folderId: ID!) {
                deleteFolderForever(folderId: $folderId) {
                  success
                  message
                }
              }
            `,
            variables: { folderId },
          }),
        });
        const { data, errors } = await response.json();
        if (errors) throw new Error(errors[0].message);
        if (!data.deleteFolderForever.success)
          throw new Error(data.deleteFolderForever.message);
      }

      // Update UI
      setFiles(files.filter((f) => !selectedItems.files.includes(f.id)));
      setFolders(folders.filter((f) => !selectedItems.folders.includes(f.id)));
      setSelectedItems({ files: [], folders: [] });
      setIsDeleteForeverModalOpen(false);
      toast.success("Selected items permanently deleted");
    } catch (err) {
      toast.error(err.message || "Permanent deletion failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle back navigation
  const handleBack = () => navigate("/workspace");

  // Logout
  const handleLogout = () => {
    clearUser();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-neutral-900">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-neutral-800 p-4 flex flex-col space-y-4">
        <a
          href="/dashboard"
          className="flex items-center text-white hover:text-orange-500"
        >
          <Briefcase size={20} className="mr-2" /> Dashboard
        </a>
        <a
          href="/workspace"
          className="flex items-center text-white hover:text-orange-500"
        >
          <Briefcase size={20} className="mr-2" /> Workspace
        </a>
        <button
          onClick={handleLogout}
          className="flex items-center text-white hover:text-orange-500"
        >
          <LogOut size={20} className="mr-2" /> Logout
        </button>
        <a
          href="/bin"
          className="flex items-center text-white hover:text-orange-500"
        >
          <Trash2 size={20} className="mr-2" /> Bin
        </a>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBack}
              className="py-2 px-4 bg-neutral-600 text-white rounded-md hover:bg-neutral-500"
            >
              <ArrowLeft size={16} className="inline mr-2" /> Back
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Bin</h1>
          </div>
          {(selectedItems.files.length > 0 ||
            selectedItems.folders.length > 0) && (
            <button
              onClick={() => setIsDeleteForeverModalOpen(true)}
              className="py-2 px-4 bg-gradient-to-r from-orange-500 to-orange-800 text-white rounded-md hover:from-orange-600 hover:to-orange-900"
            >
              <Trash2 size={16} className="inline mr-2" /> Delete Forever
            </button>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="relative bg-neutral-800 p-4 rounded-lg text-center"
            >
              <input
                type="checkbox"
                checked={selectedItems.folders.includes(folder.id)}
                onChange={() => handleSelectItem("folders", folder.id)}
                className="absolute top-2 left-2 h-4 w-4 text-orange-500 border-neutral-600 rounded focus:ring-orange-500"
              />
              <Folder size={40} className="text-orange-500 mx-auto mb-2" />
              <p className="text-white text-sm truncate">{folder.name}</p>
            </div>
          ))}
          {files.map((file) => (
            <div
              key={file.id}
              className="relative bg-neutral-800 p-4 rounded-lg text-center"
            >
              <input
                type="checkbox"
                checked={selectedItems.files.includes(file.id)}
                onChange={() => handleSelectItem("files", file.id)}
                className="absolute top-2 left-2 h-4 w-4 text-orange-500 border-neutral-600 rounded focus:ring-orange-500"
              />
              {file.fileType === "image" && (
                <Image size={40} className="text-orange-500 mx-auto mb-2" />
              )}
              {file.fileType === "pdf" && (
                <FileText size={40} className="text-orange-500 mx-auto mb-2" />
              )}
              {file.fileType === "doc" && (
                <FileText size={40} className="text-orange-500 mx-auto mb-2" />
              )}
              {file.fileType === "mp3" && (
                <Music size={40} className="text-orange-500 mx-auto mb-2" />
              )}
              {file.fileType === "video" && (
                <Video size={40} className="text-orange-500 mx-auto mb-2" />
              )}
              <p className="text-white text-sm truncate">{file.name}</p>
            </div>
          ))}
        </div>

        {/* Delete Forever Modal */}
        {isDeleteForeverModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              ref={deleteModalRef}
              className="bg-neutral-800 p-6 rounded-lg w-full max-w-md"
            >
              <h2 className="text-xl font-bold text-white mb-4">
                Delete Forever
              </h2>
              <p className="text-neutral-400 mb-4">
                Are you sure you want to permanently delete{" "}
                {selectedItems.files.length} file(s) and{" "}
                {selectedItems.folders.length} folder(s)? This action cannot be
                undone.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsDeleteForeverModalOpen(false)}
                  className="py-2 px-4 bg-neutral-600 text-white rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteForever}
                  className="py-2 px-4 bg-gradient-to-r from-orange-500 to-orange-800 text-white rounded-md hover:from-orange-600 hover:to-orange-900"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Bin;
