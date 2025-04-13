from json import load, loads, dump, JSONDecodeError
from fastapi import UploadFile
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import zipfile
import shutil
import os


class JsonManifest:
    class Header(BaseModel):
        name: str
        description: Optional[str] = ""
        uuid: UUID
        version: List[int] | str
        min_engine_version: List[int]

    class Module(BaseModel):
        description: Optional[str] = ""
        language: Optional[str] = None
        type: str
        uuid: UUID
        version: List[int] | str
        entry: Optional[str] = None

    class Metadata(BaseModel):
        authors: Optional[List[str]] = None
        license: Optional[str] = None
        url: Optional[str] = None

    class Dependency(BaseModel):
        module_name: Optional[str] = None
        uuid: Optional[UUID] = None
        version: List[int] | str

    class Manifest(BaseModel):
        format_version: int
        header: 'JsonManifest.Header'
        modules: List['JsonManifest.Module']
        capabilities: Optional[List[str]] = None
        dependencies: Optional[List['JsonManifest.Dependency']] = None
        metadata: Optional['JsonManifest.Metadata'] = None

    class Mod(BaseModel):
        pack_id: UUID
        version: List[int] | str
        subpack: Optional[str] = None

        class Config:
            exclude_none = True

    def load(self, path: str) -> Optional['JsonManifest.Manifest']:
        try:
            with open(path, "r") as f:
                data = load(f)
                return self.Manifest(**data)
        except (JSONDecodeError, FileNotFoundError) as e:
            print(f"Error reading manifest: {e}")
        return None

    def save(self, path: str, manifest: 'JsonManifest.Manifest') -> bool:
        try:
            with open(path, "w") as f:
                f.write(manifest.model_dump_json(indent=2))
            return True
        except Exception as e:
            print(f"Error saving manifest: {e}")
            return False

    def update_mod_json(self, path: str, mod: 'JsonManifest.Mod'):
        data = []
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    raw_content = f.read()
                    if not raw_content.strip():
                        data = []
                    else:
                        try:
                            data = loads(raw_content)

                            if not isinstance(data, list):
                                data = []
                        except JSONDecodeError:
                            print(
                                f"Warning: Invalid JSON in {path}, starting fresh")
                            data = []
            except Exception as e:
                print(f"Error reading {path}: {e}")
                data = []

        # Filter out existing entries with the same pack_id
        data = [entry for entry in data if isinstance(
            entry, dict) and entry.get("pack_id") != str(mod.pack_id)]

        # Add the new mod entry
        mod_dict = mod.model_dump(exclude_none=True)
        mod_dict["pack_id"] = str(mod_dict["pack_id"])

        data.append(mod_dict)

        print(data)

        # Write the updated data with proper formatting
        with open(path, "w") as f:
            dump(data, f, indent=2)

    def correct_mod_path(self, base_path: str, mod_name: str) -> str:
        """
        This function ensures that the mod path doesn't have an extra nested directory.
        If the path has an additional layer (mod_name/mod_name), it will fix the path.
        """
        mod_dir = os.path.join(base_path, mod_name)
        if os.path.isdir(mod_dir) and os.path.isdir(os.path.join(mod_dir, mod_name)):
            print(f"Fixing path: {mod_dir}/{mod_name} -> {mod_dir}")
            return mod_dir  # Correct path
        return mod_dir  # Return as is if no correction is needed


class ModLoader:
    def __init__(self, server_world_path=r"worlds\Main"):
        self.target_dir = server_world_path
        self.extracted_path = "extracted_files"
        self.jm = JsonManifest()

    def _find_manifest(self, root_dir: str) -> Optional[str]:
        for root, _, files in os.walk(root_dir):
            if "manifest.json" in files:
                return os.path.join(root, "manifest.json")
        return None

    def _move_folder(self, source: str, dest: str, force=False):
        if os.path.exists(dest):
            if not force:
                raise FileExistsError(f"Destination {dest} already exists.")
            shutil.rmtree(dest)
        shutil.move(source, dest)

    def _handle_pack(self, pack_path: str, pack_type: str, force=False):
        with zipfile.ZipFile(pack_path, 'r') as pack_zip:
            extracted_folder = os.path.join(
                self.extracted_path, os.path.splitext(os.path.basename(pack_path))[0])
            os.makedirs(extracted_folder, exist_ok=True)
            pack_zip.extractall(extracted_folder)

        os.remove(pack_path)

        # Flatten if the extracted folder contains a single subfolder with the same name
        entries = os.listdir(extracted_folder)
        if len(entries) == 1:
            single_subdir = os.path.join(extracted_folder, entries[0])
            if os.path.isdir(single_subdir) and os.path.basename(single_subdir).lower() in os.path.basename(extracted_folder).lower():
                print(f"Flattening: {single_subdir} -> {extracted_folder}")
                for item in os.listdir(single_subdir):
                    shutil.move(os.path.join(single_subdir, item),
                                extracted_folder)
                os.rmdir(single_subdir)

        base_dir = os.path.join(self.target_dir, f"{pack_type}_packs")
        os.makedirs(base_dir, exist_ok=True)

        dest_path = os.path.join(base_dir, os.path.basename(extracted_folder))

        self._move_folder(extracted_folder, dest_path, force)

        manifest_path = self._find_manifest(dest_path)
        if manifest_path:
            data = self.jm.load(manifest_path)
            if data:
                mod = self.jm.Mod(pack_id=data.header.uuid,
                                  version=data.header.version)
                mod_list_file = os.path.join(
                    self.target_dir, f"world_{pack_type}_pack.json")
                self.jm.update_mod_json(mod_list_file, mod)

    def load_mod(self, mcaddon_path: str, force=False):
        mod_base = os.path.basename(mcaddon_path).split(".", 1)[0].capitalize()
        print(f"Loading mod: {mod_base}")
        mod_dir = os.path.join(self.extracted_path, f"{mod_base}.mc")

        with zipfile.ZipFile(mcaddon_path, 'r') as zip_ref:
            zip_ref.extractall(self.extracted_path)

        # If it's nested inside its name.mc directory
        if os.path.exists(mod_dir):
            for item in os.listdir(mod_dir):
                shutil.move(os.path.join(mod_dir, item), self.extracted_path)
            os.rmdir(mod_dir)

        for entry in os.listdir(self.extracted_path):
            path = os.path.join(self.extracted_path, entry)
            if "beh" in entry.lower() or "bp" in entry.lower():
                pack_type = "behavior"
            elif "res" in entry.lower() or "rp" in entry.lower():
                pack_type = "resource"
            else:
                continue

            if os.path.isdir(path):
                print(f"Moving raw {pack_type} folder: {entry}")
                dest_path = os.path.join(
                    self.target_dir, f"{pack_type}_packs", entry)
                self._move_folder(path, dest_path, force)

                manifest_path = self._find_manifest(dest_path)
                if manifest_path:
                    data = self.jm.load(manifest_path)
                    if data:
                        mod = self.jm.Mod(pack_id=data.header.uuid,
                                          version=data.header.version)
                        mod_list_file = os.path.join(
                            self.target_dir, f"world_{pack_type}_pack.json")
                        self.jm.update_mod_json(mod_list_file, mod)
            elif zipfile.is_zipfile(path) and (path.endswith(".mcpack") or path.endswith(".zip")):
                if path.endswith(".zip"):
                    new_path = path.replace(".zip", ".mcpack")
                    os.rename(path, new_path)
                    path = new_path
                print(f"Processing {os.path.basename(path)}...")
                self._handle_pack(path, pack_type, force=force)

        print("Mod load complete.")


class ModMetadata(BaseModel):
    name: str
    description: str
    uuid: UUID
    version: List[int]
    authors: Optional[List[str]]
    type: str  # 'behavior' or 'resource'


class ModManager:
    def __init__(self, world_path: str, temp_path: str = "temp_mod_extract"):
        self.world_path = world_path
        self.temp_path = temp_path
        self.behavior_dir = os.path.join(world_path, "behavior_packs")
        self.resource_dir = os.path.join(world_path, "resource_packs")
        os.makedirs(self.behavior_dir, exist_ok=True)
        os.makedirs(self.resource_dir, exist_ok=True)

    def extract_mod(self, file: UploadFile) -> List[ModMetadata]:
        extract_dir = os.path.join(
            self.temp_path, os.path.splitext(file.filename)[0])
        os.makedirs(extract_dir, exist_ok=True)

        with zipfile.ZipFile(file.file, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)

        mods = []
        for root, dirs, files in os.walk(extract_dir):
            if "manifest.json" in files:
                manifest_path = os.path.join(root, "manifest.json")
                with open(manifest_path) as f:
                    data = load(f)
                    metadata = ModMetadata(
                        name=data["header"]["name"],
                        description=data["header"].get("description", ""),
                        uuid=data["header"]["uuid"],
                        version=data["header"]["version"],
                        authors=data.get("metadata", {}).get("authors", []),
                        type="behavior" if "behavior" in file.filename.lower() else "resource"
                    )
                    mods.append(metadata)

                # Copy mod files to correct directory
                dest_dir = self.behavior_dir if metadata.type == "behavior" else self.resource_dir
                mod_dest = os.path.join(dest_dir, os.path.basename(root))
                if os.path.exists(mod_dest):
                    shutil.rmtree(mod_dest)
                shutil.move(root, mod_dest)

        shutil.rmtree(extract_dir, ignore_errors=True)
        return mods

    def list_mods(self) -> List[ModMetadata]:
        mods = []
        for mod_type, mod_dir in [("behavior", self.behavior_dir), ("resource", self.resource_dir)]:
            for subdir in os.listdir(mod_dir):
                manifest_path = os.path.join(mod_dir, subdir, "manifest.json")
                try:
                    with open(manifest_path, 'r') as f:
                        data = load(f)
                        mods.append(ModMetadata(
                            name=data["header"]["name"],
                            description=data["header"].get("description", ""),
                            uuid=data["header"]["uuid"],
                            version=data["header"]["version"],
                            authors=data.get("metadata", {}).get(
                                "authors", []),
                            type=mod_type
                        ))
                except Exception as e:
                    print(f"Failed to read manifest for {subdir}: {e}")
        return mods

    def remove_mod(self, uuid: UUID) -> bool:
        success = False
        for mod_dir in [self.behavior_dir, self.resource_dir]:
            for subdir in os.listdir(mod_dir):
                manifest_path = os.path.join(mod_dir, subdir, "manifest.json")
                if os.path.exists(manifest_path):
                    with open(manifest_path) as f:
                        try:
                            data = load(f)
                            if data["header"]["uuid"] == str(uuid):
                                shutil.rmtree(os.path.join(
                                    mod_dir, subdir), ignore_errors=True)
                                success = True
                        except Exception as e:
                            print(f"Error removing mod {uuid}: {e}")
        return success
