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
import toast from "react-hot-toast";

const Workspace = () => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dropdownFileId, setDropdownFileId] = useState(null);

  const { user, token, clearUser } = useUserStore();
  const navigate = useNavigate();

  const endpoint = "https://cryogena-backend.onrender.com/graphql/";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ✅ Fetch workspace data
  const fetchWorkspaceData = async () => {
    setLoading(true);
    setError("");

    try {
      // Files
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

      // Folders
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

  useEffect(() => {
    if (!user || !token) {
      navigate("/login");
      return;
    }
    fetchWorkspaceData();
  }, [user, token, navigate]);

  // ✅ Logout
  const handleLogout = () => {
    clearUser();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  // ✅ Create Folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Folder name cannot be empty");
      return;
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: `
            mutation ($name: String!) {
              createFolder(name: $name) {
                folder {
                  id
                  name
                }
              }
            }
          `,
          variables: { name: newFolderName },
        }),
      });
      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);

      setFolders((prev) => [data.createFolder.folder, ...prev]);
      setNewFolderName("");
      setIsModalOpen(false);
      toast.success("Folder created successfully");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ✅ Upload Files
  const handleUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles.length) return;

    const formData = new FormData();
    formData.append(
      "operations",
      JSON.stringify({
        query: `
          mutation ($files: [Upload!]!) {
            uploadFile(files: $files) {
              success
              message
            }
          }
        `,
        variables: { files: new Array(selectedFiles.length).fill(null) },
      })
    );

    const map = {};
    Array.from(selectedFiles).forEach((_, i) => {
      map[i] = [`variables.files.${i}`];
    });
    formData.append("map", JSON.stringify(map));

    Array.from(selectedFiles).forEach((file, i) => {
      formData.append(i, file);
    });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0].message);

      toast.success(result.data.uploadFile.message || "Files uploaded!");
      fetchWorkspaceData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ✅ Loading UI
  if (loading) {
    return (
      <div className="fixed inset-0 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500"></div>
      </div>
    );
  }

  // ✅ Error UI
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  // ✅ Main UI
  return (
    <div className="flex h-screen bg-neutral-900">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-800 p-4 flex flex-col space-y-4 shadow-lg fixed top-0 left-0 bottom-0 z-40 mt-16">
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
      <div className="flex-1 ml-64 flex flex-col">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-neutral-900 border-b border-neutral-700 px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Workspace</h1>
          <div className="flex space-x-2">
            <label className="bg-orange-500 px-4 py-2 rounded flex items-center cursor-pointer">
              <Upload className="mr-2" size={18} /> Upload
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6 text-white">
          {/* Files */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Files</h2>
            {files.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-neutral-800 p-4 rounded-lg shadow hover:shadow-lg hover:bg-neutral-700 transition flex flex-col"
                  >
                    {/* File preview */}
                    <div className="flex-1 flex items-center justify-center mb-2">
                      <div className="w-12 h-12 bg-neutral-700 rounded flex items-center justify-center text-lg">
                        {file.fileType?.includes("pdf")
                          ? "📄"
                          : file.fileType?.includes("image")
                          ? "🖼️"
                          : "📁"}
                      </div>
                    </div>

                    {/* File name */}
                    <p
                      className="text-sm text-white truncate w-full"
                      title={file.name}
                    >
                      {file.name}
                    </p>

                    {/* File actions */}
                    <div className="flex items-center justify-between mt-2 text-xs text-neutral-400">
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      <MoreVertical
                        className="cursor-pointer"
                        size={16}
                        onClick={() =>
                          setDropdownFileId(
                            dropdownFileId === file.id ? null : file.id
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-400">No files uploaded yet.</p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default Workspace;
