import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Trash2,
  Briefcase,
  MoreVertical,
  FolderPlus,
  Upload,
} from "lucide-react";
import useUserStore from "../../store/userStore";

const Workspace = () => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [dropdownFileId, setDropdownFileId] = useState(null);
  const [renameFileId, setRenameFileId] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const { user, token, clearUser } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !token) {
      navigate("/login");
      return;
    }

    const fetchWorkspaceData = async () => {
      setLoading(true);
      setError("");

      try {
        const endpoint = "https://cryogena-backend.onrender.com/graphql/";
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // ✅ Fetch files
        const filesResponse = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `
              query {
                userFiles {
                  id
                  name
                  ownerAvatar
                  createdAt
                  size
                  fileType
                  fileUrl
                }
              }
            `,
          }),
        });
        const { data: filesData, errors: filesErrors } =
          await filesResponse.json();
        if (filesErrors) throw new Error(filesErrors[0].message);
        setFiles(filesData.userFiles);

        // ✅ Fetch folders
        const foldersResponse = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `
              query {
                userFolders {
                  id
                  name
                  createdAt
                }
              }
            `,
          }),
        });
        const { data: foldersData, errors: foldersErrors } =
          await foldersResponse.json();
        if (foldersErrors) throw new Error(foldersErrors[0].message);
        setFolders(foldersData.userFolders);
      } catch (err) {
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceData();
  }, [user, token, navigate]);

  const handleLogout = () => {
    clearUser();
    navigate("/login");
  };

  const handleFileChange = (e) => {
    setSelectedFiles([...e.target.files]);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) return;

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("file", file));

    try {
      const response = await fetch(
        "https://cryogena-backend.onrender.com/graphql/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );
      if (!response.ok) throw new Error("Upload failed");
      alert("File uploaded successfully!");
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500"></div>
      </div>
    );
  }

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

      {/* Main Content */}
      <main className="flex-1 p-6 text-white">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Workspace</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-orange-500 px-4 py-2 rounded flex items-center"
            >
              <FolderPlus className="mr-2" size={18} /> New Folder
            </button>
            <label className="bg-orange-500 px-4 py-2 rounded flex items-center cursor-pointer">
              <Upload className="mr-2" size={18} /> Upload
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            <button
              onClick={handleUpload}
              className="bg-green-600 px-4 py-2 rounded"
            >
              Save Upload
            </button>
          </div>
        </div>

        {/* Folders Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Folders</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {folders.length > 0 ? (
              folders.map((folder) => (
                <div
                  key={folder.id}
                  className="bg-neutral-800 p-4 rounded shadow hover:shadow-lg transition"
                >
                  📁 {folder.name}
                </div>
              ))
            ) : (
              <p className="text-neutral-400">No folders created yet.</p>
            )}
          </div>
        </section>

        {/* Files Section */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Files</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {files.length > 0 ? (
              files.map((file) => (
                <div
                  key={file.id}
                  className="bg-neutral-800 p-4 rounded shadow flex justify-between items-center hover:shadow-lg transition"
                >
                  <span>{file.name}</span>
                  <MoreVertical className="cursor-pointer" size={18} />
                </div>
              ))
            ) : (
              <p className="text-neutral-400">No files uploaded yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Workspace;
