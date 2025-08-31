import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LogOut,
  Trash2,
  Download,
  Briefcase,
  FolderPlus,
  Upload,
  Folder,
  Image,
  FileText,
  Music,
  Video,
  ArrowLeft,
  Pencil,
} from "lucide-react";
import useUserStore from "../../store/userStore";
import toast from "react-hot-toast";

const Workspace = () => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFileId, setRenameFileId] = useState(null);
  const [renameFolderId, setRenameFolderId] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const { user, token, clearUser } = useUserStore();
  const navigate = useNavigate();
  const { folderId } = useParams();
  const mainRef = useRef(null);
  const fileInputRef = useRef(null);
  const contextMenuRef = useRef(null);
  const renameModalRef = useRef(null);

  const endpoint = "https://cryogena-backend.onrender.com/graphql/";
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Fetch workspace data
  const fetchWorkspaceData = async () => {
    setLoading(true);
    setError("");
    try {
      if (folderId) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `
              query ($folderId: ID!) {
                folderContents(folderId: $folderId) {
                  files { id name ownerAvatar createdAt size fileType fileUrl }
                  folders { id name createdAt }
                }
                folderInfo(folderId: $folderId) { id name parentId }
              }
            `,
            variables: { folderId },
          }),
        });
        const { data, errors } = await response.json();
        if (errors) throw new Error(errors[0].message);
        setFiles(data.folderContents.files);
        setFolders(data.folderContents.folders);
        setCurrentFolder(data.folderInfo);
      } else {
        const filesResponse = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `query { userFiles { id name ownerAvatar createdAt size fileType fileUrl } }`,
          }),
        });
        const { data: filesData, errors: filesErrors } =
          await filesResponse.json();
        if (filesErrors) throw new Error(filesErrors[0].message);
        setFiles(filesData.userFiles);

        const foldersResponse = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `query { userFolders { id name createdAt } }`,
          }),
        });
        const { data: foldersData, errors: foldersErrors } =
          await foldersResponse.json();
        if (foldersErrors) throw new Error(foldersErrors[0].message);
        setFolders(foldersData.userFolders);
        setCurrentFolder(null);
      }
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
  }, [user, token, navigate, folderId]);

  // Handle folder navigation
  const handleFolderDoubleClick = (folderId) =>
    navigate(`/workspace/${folderId}`);
  const handleBack = () =>
    currentFolder?.parentId
      ? navigate(`/workspace/${currentFolder.parentId}`)
      : navigate("/workspace");

  // Context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  };

  // Close context menu and rename modal
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        contextMenuRef.current?.contains(e.target) ||
        renameModalRef.current?.contains(e.target)
      ) {
        return;
      }
      setIsContextMenuOpen(false);
      setIsRenameModalOpen(false);
      setRenameFileId(null);
      setRenameFolderId(null);
      setNewFileName("");
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Logout
  const handleLogout = () => {
    clearUser();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  // Create Folder
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
            mutation ($name: String!, $parentId: ID) {
              createFolder(name: $name, parentId: $parentId) {
                folder { id name createdAt }
              }
            }
          `,
          variables: { name: newFolderName, parentId: folderId || null },
        }),
      });
      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);

      setFolders([data.createFolder.folder, ...folders]);
      setNewFolderName("");
      setIsNewFolderModalOpen(false);
      setIsContextMenuOpen(false);
      toast.success("Folder created successfully");
      return data.createFolder.folder.id;
    } catch (err) {
      toast.error(err.message);
      return null;
    }
  };

  // Upload Files
  const handleUpload = async (files, uploadFolderId = null) => {
    if (!files.length) {
      toast.error("Please select files to upload.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      const operations = {
        query: `
          mutation ($files: [Upload!]!, $folderId: ID) {
            uploadFile(files: $files, folderId: $folderId) {
              success
              message
            }
          }
        `,
        variables: {
          files: new Array(files.length).fill(null),
          folderId: uploadFolderId || selectedFolderId || folderId,
        },
      };
      formData.append("operations", JSON.stringify(operations));
      const map = {};
      Array.from(files).forEach((_, i) => {
        map[i] = [`variables.files.${i}`];
      });
      formData.append("map", JSON.stringify(map));
      Array.from(files).forEach((file, i) => formData.append(`${i}`, file));

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);
      if (data.uploadFile.success) {
        await fetchWorkspaceData();
        setSelectedFiles([]);
        setSelectedFolderId(null);
        setIsUploadModalOpen(false);
        toast.success(data.uploadFile.message);
      }
    } catch (err) {
      toast.error(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  // Right-Click Upload to New Folder
  const handleUploadToNewFolder = async () => {
    setIsContextMenuOpen(false);
    setIsNewFolderModalOpen(true);
    setNewFolderName("New Folder");
  };

  // Handle modal submission (folder creation or file upload)
  const handleModalSubmit = async (isNewFolderModal) => {
    if (isNewFolderModal) {
      if (!newFolderName.trim()) {
        toast.error("Folder name cannot be empty");
        return;
      }
      const newFolderId = await handleCreateFolder();
      if (newFolderId && selectedFiles.length) {
        await handleUpload(selectedFiles, newFolderId);
      }
    } else if (selectedFiles.length) {
      await handleUpload(selectedFiles);
    } else {
      toast.error("Please select files to upload.");
    }
  };

  // Rename File or Folder
  const handleRename = async (id, newName, isFolder = false) => {
    setLoading(true);
    try {
      const query = isFolder
        ? `
            mutation ($folderId: ID!, $newName: String!) {
              renameFolder(folderId: $folderId, newName: $newName) {
                success
                message
              }
            }
          `
        : `
            mutation ($fileId: ID!, $newName: String!) {
              renameFile(fileId: $fileId, newName: $newName) {
                success
                message
              }
            }
          `;
      const variables = isFolder
        ? { folderId: id, newName }
        : { fileId: id, newName };

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      });
      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);
      if (data[isFolder ? "renameFolder" : "renameFile"].success) {
        if (isFolder) {
          setFolders(
            folders.map((f) => (f.id === id ? { ...f, name: newName } : f))
          );
          if (currentFolder?.id === id) {
            setCurrentFolder({ ...currentFolder, name: newName });
          }
        } else {
          setFiles(
            files.map((f) => (f.id === id ? { ...f, name: newName } : f))
          );
        }
        setRenameFileId(null);
        setRenameFolderId(null);
        setNewFileName("");
        setIsRenameModalOpen(false);
        toast.success(
          isFolder ? "Folder renamed successfully" : "File renamed successfully"
        );
      }
    } catch (err) {
      toast.error(
        err.message ||
          (isFolder ? "Folder rename failed" : "File rename failed")
      );
    } finally {
      setLoading(false);
    }
  };

  // Delete File or Folder
  const handleDelete = async (id, isFolder = false) => {
    setLoading(true);
    try {
      const query = isFolder
        ? `
            mutation ($folderId: ID!) {
              deleteFolder(folderId: $folderId) {
                success
                message
              }
            }
          `
        : `
            mutation ($fileId: ID!) {
              deleteFile(fileId: $fileId) {
                success
                message
              }
            }
          `;
      const variables = isFolder ? { folderId: id } : { fileId: id };

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      });
      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);
      if (data[isFolder ? "deleteFolder" : "deleteFile"].success) {
        if (isFolder) {
          setFolders(folders.filter((f) => f.id !== id));
        } else {
          setFiles(files.filter((f) => f.id !== id));
        }
        toast.success(isFolder ? "Folder moved to bin" : "File moved to bin");
      }
    } catch (err) {
      toast.error(
        err.message ||
          (isFolder ? "Folder delete failed" : "File delete failed")
      );
    } finally {
      setLoading(false);
    }
  };

  // Loading state
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

      {/* Main */}
      <main
        ref={mainRef}
        onContextMenu={handleContextMenu}
        className="flex-1 p-4 md:p-8"
      >
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            {folderId && (
              <button
                onClick={handleBack}
                className="py-2 px-4 bg-neutral-600 text-white rounded-md hover:bg-neutral-500"
              >
                <ArrowLeft size={16} className="inline mr-2" /> Back
              </button>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {currentFolder ? currentFolder.name : "Workspace"}
            </h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsNewFolderModalOpen(true)}
              className="py-2 px-4 bg-gradient-to-r from-orange-500 to-orange-800 text-white rounded-md hover:from-orange-600 hover:to-orange-900"
            >
              <FolderPlus size={16} className="inline mr-2" /> New Folder
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="py-2 px-4 bg-gradient-to-r from-orange-500 to-orange-800 text-white rounded-md hover:from-orange-600 hover:to-orange-900"
            >
              <Upload size={16} className="inline mr-2" /> Upload
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="relative bg-neutral-800 p-4 rounded-lg text-center cursor-pointer"
              onDoubleClick={() => handleFolderDoubleClick(folder.id)}
            >
              <Folder size={40} className="text-orange-500 mx-auto mb-2" />
              <p className="text-white text-sm truncate">{folder.name}</p>
              <div className="absolute top-2 right-2 flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameFolderId(folder.id);
                    setRenameFileId(null);
                    setNewFileName(folder.name);
                    setIsRenameModalOpen(true);
                  }}
                  className="text-neutral-400 hover:text-orange-500"
                >
                  <Pencil size={20} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(folder.id, true);
                  }}
                  className="text-neutral-400 hover:text-orange-500"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
          {files.map((file) => (
            <div
              key={file.id}
              className="relative bg-neutral-800 p-4 rounded-lg text-center"
            >
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
              <div className="absolute top-2 right-2 flex space-x-2">
                <button
                  onClick={() => window.open(file.fileUrl, "_blank")}
                  className="text-neutral-400 hover:text-orange-500"
                >
                  <Download size={20} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameFileId(file.id);
                    setRenameFolderId(null);
                    setNewFileName(file.name);
                    setIsRenameModalOpen(true);
                  }}
                  className="text-neutral-400 hover:text-orange-500"
                >
                  <Pencil size={20} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.id);
                  }}
                  className="text-neutral-400 hover:text-orange-500"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Context Menu */}
        {isContextMenuOpen && (
          <div
            ref={contextMenuRef}
            className="absolute bg-neutral-700 rounded-md shadow-lg z-50"
            style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
          >
            <button
              onClick={() => {
                setIsNewFolderModalOpen(true);
                setNewFolderName("New Folder");
                setIsContextMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-white hover:bg-neutral-600"
            >
              New Folder
            </button>
            <button
              onClick={handleUploadToNewFolder}
              className="block w-full text-left px-4 py-2 text-white hover:bg-neutral-600"
            >
              Upload to New Folder
            </button>
          </div>
        )}

        {/* Upload Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-neutral-800 p-6 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">
                Upload Files
              </h2>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.mp3,.mp4"
                onChange={(e) => setSelectedFiles([...e.target.files])}
                className="w-full p-2 mb-4 bg-neutral-700 text-white rounded-md"
                ref={fileInputRef}
              />
              <select
                value={selectedFolderId || ""}
                onChange={(e) => setSelectedFolderId(e.target.value || null)}
                className="w-full p-2 mb-4 rounded-md bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:border-orange-500"
              >
                <option value="">No Folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setSelectedFiles([]);
                    setSelectedFolderId(null);
                  }}
                  className="py-2 px-4 bg-neutral-600 text-white rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleModalSubmit(false)}
                  className="py-2 px-4 bg-gradient-to-r from-orange-500 to-orange-800 text-white rounded-md hover:from-orange-600 hover:to-orange-900"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Folder Modal */}
        {isNewFolderModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-neutral-800 p-6 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">
                Create Folder
              </h2>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="New Folder Name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full p-2 rounded-md bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:border-orange-500"
                />
                <FolderPlus
                  size={20}
                  className="absolute top-2 right-2 text-neutral-400"
                />
              </div>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.mp3,.mp4"
                onChange={(e) => setSelectedFiles([...e.target.files])}
                className="w-full p-2 mb-4 bg-neutral-700 text-white rounded-md"
              />
              <select
                value={selectedFolderId || ""}
                onChange={(e) => setSelectedFolderId(e.target.value || null)}
                className="w-full p-2 mb-4 rounded-md bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:border-orange-500"
              >
                <option value="">No Folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsNewFolderModalOpen(false);
                    setSelectedFiles([]);
                    setNewFolderName("");
                    setSelectedFolderId(null);
                  }}
                  className="py-2 px-4 bg-neutral-600 text-white rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleModalSubmit(true)}
                  className="py-2 px-4 bg-gradient-to-r from-orange-500 to-orange-800 text-white rounded-md hover:from-orange-600 hover:to-orange-900"
                >
                  Create Folder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Modal */}
        {isRenameModalOpen && (renameFileId || renameFolderId) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              ref={renameModalRef}
              className="bg-neutral-800 p-6 rounded-lg w-full max-w-md"
            >
              <h2 className="text-xl font-bold text-white mb-4">
                {renameFileId ? "Rename File" : "Rename Folder"}
              </h2>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full p-2 mb-4 rounded-md bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:border-orange-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsRenameModalOpen(false);
                    setRenameFileId(null);
                    setRenameFolderId(null);
                    setNewFileName("");
                  }}
                  className="py-2 px-4 bg-neutral-600 text-white rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleRename(
                      renameFileId || renameFolderId,
                      newFileName,
                      !!renameFolderId
                    )
                  }
                  className="py-2 px-4 bg-gradient-to-r from-orange-500 to-orange-800 text-white rounded-md hover:from-orange-600 hover:to-orange-900"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Workspace;
