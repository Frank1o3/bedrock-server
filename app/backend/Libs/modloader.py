from json import load, loads, dump, JSONDecodeError
from uuid import UUID
from typing import List, Optional, Tuple
import zipfile
import shutil
import os
from pydantic import BaseModel


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


    def load(self, path: str) -> Optional['JsonManifest.Manifest']:
        try:
            with open(path, "r", encoding='utf-8') as f:
                data = load(f)
                return self.Manifest(**data)
        except (JSONDecodeError, FileNotFoundError) as e:
            print(f"Error reading manifest: {e}")
        return None

    def save(self, path: str, manifest: 'JsonManifest.Manifest') -> bool:
        try:
            with open(path, "w", encoding='utf-8') as f:
                f.write(manifest.model_dump_json(indent=2))
            return True
        except Exception as e:
            print(f"Error saving manifest: {e}")
            return False

    def update_mod_json(self, path: str, mod: 'JsonManifest.Mod'):
        data: list[dict] = []
        if os.path.exists(path):
            try:
                with open(path, "r", encoding='utf-8') as f:
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
        with open(path, "w", encoding='utf-8') as f:
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
    def __init__(self, server_world_path="/bedrock"):
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


class ModManager:
    def __init__(self, world_path: str = "/bedrock/worlds/Main"):
        self.world_path = world_path
        self.behavior_dir = os.path.join(world_path, "behavior_packs")
        self.resource_dir = os.path.join(world_path, "resource_packs")
        self.world_behavior_dir = os.path.join(
            world_path, "world_behavior_pack.json")
        self.world_resource_dir = os.path.join(
            world_path, "world_resource_pack.json")
        os.makedirs(self.behavior_dir, exist_ok=True)
        os.makedirs(self.resource_dir, exist_ok=True)

    def _find_manifest(self, root_dir: str) -> Optional[str]:
        for root, _, files in os.walk(root_dir):
            if "manifest.json" in files:
                return os.path.join(root, "manifest.json")
        return None


    def list_all_mods(self) -> Tuple[List[JsonManifest.Manifest],List[JsonManifest.Manifest]]:
        behavior_packs: List[JsonManifest.Manifest] = []
        resource_packs: List[JsonManifest.Manifest] = []
        
        for entry in os.listdir(self.behavior_dir):
            path = os.path.join(self.behavior_dir, entry)
            manifest = self._find_manifest(path)
            if manifest:
                with open(manifest, 'r', encoding='utf-8') as f:
                    data = load(f)
                    behavior_packs.append(JsonManifest.Manifest(**data))
        
        for entry in os.listdir(self.resource_dir):
            path = os.path.join(self.resource_dir, entry)
            manifest = self._find_manifest(path)
            if manifest:
                with open(manifest, 'r', encoding='utf-8') as f:
                    data = load(f)
                    resource_packs.append(JsonManifest.Manifest(**data))
        
        behavior_uuids = {mod.header.name for mod in behavior_packs}
        resource_packs = [
            mod for mod in resource_packs if mod.header.name not in behavior_uuids
        ]

        return behavior_packs, resource_packs

    def list_all_active_mods(self) -> Tuple[List[JsonManifest.Mod], List[JsonManifest.Mod]]:
        behavior_packs: List[JsonManifest.Mod] = []
        resource_packs: List[JsonManifest.Mod] = []

        with open(self.world_behavior_dir, 'r', encoding='utf-8') as f:
            try:
                data = load(f)
                behavior_packs = [JsonManifest.Mod(**mod) for mod in data]
            except JSONDecodeError as e:
                print(e)

        with open(self.world_resource_dir, 'r', encoding='utf-8') as f:
            try:
                data = load(f)
                resource_packs = [JsonManifest.Mod(**mod) for mod in data]
            except JSONDecodeError as e:
                print(e)

        # Check if one of the behavior packs shares similar data with a resourse pack if true then remove the resource pack from the list
        behavior_pack_ids = {str(mod.pack_id) for mod in behavior_packs}
        resource_packs = [
            mod for mod in resource_packs if str(mod.pack_id) not in behavior_pack_ids
        ]
        return behavior_packs, resource_packs

    def look_up(self, uuid: UUID) -> JsonManifest.Manifest | None:
        for entry in os.listdir(self.behavior_dir):
            path = os.path.join(self.behavior_dir, entry)
            manifest = self._find_manifest(path)
            if manifest:
                with open(manifest, 'r', encoding='utf-8') as f:
                    data = load(f)
                    mod = JsonManifest.Manifest(**data)
                    if mod.header.uuid == uuid:
                        return mod
        
        for entry in os.listdir(self.resource_dir):
            path = os.path.join(self.resource_dir, entry)
            manifest = self._find_manifest(path)
            if manifest:
                with open(manifest, 'r', encoding='utf-8') as f:
                    data = load(f)
                    mod = JsonManifest.Manifest(**data)
                    if mod.header.uuid == uuid:
                        return mod
        return None

    def remove_mod(self, uuid: UUID) -> bool:
        """Remove a mod from the filesystem and world configuration"""
        success = False
        mod_type = None
        
        # Remove from filesystem
        for mod_dir, pack_type in [(self.behavior_dir, "behavior"), (self.resource_dir, "resource")]:
            for subdir in os.listdir(mod_dir):
                manifest_path = os.path.join(mod_dir, subdir, "manifest.json")
                if os.path.exists(manifest_path):
                    with open(manifest_path, encoding='utf-8') as f:
                        try:
                            data = load(f)
                            if data["header"]["uuid"] == str(uuid):
                                shutil.rmtree(os.path.join(mod_dir, subdir), ignore_errors=True)
                                success = True
                                mod_type = pack_type
                                break
                        except Exception as e:
                            print(f"Error removing mod {uuid}: {e}")
            if success:
                break
        
        # Remove from world configuration if found
        if success and mod_type:
            self._remove_from_world_config(uuid, mod_type)
        
        return success

    def _remove_from_world_config(self, uuid: UUID, pack_type: str):
        """Remove mod from world configuration JSON"""
        config_file = os.path.join(self.world_path, f"world_{pack_type}_packs.json")
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    data = load(f)
                
                # Filter out the mod with the given UUID
                data = [mod for mod in data if mod.get("pack_id") != str(uuid)]
                
                with open(config_file, 'w', encoding='utf-8') as f:
                    dump(data, f, indent=2)
                    
                print(f"Removed mod {uuid} from {config_file}")
            except Exception as e:
                print(f"Error removing mod from world config: {e}")

    def enable_mod(self, uuid: UUID, pack_type: str) -> bool:
        """Enable a mod by adding it to the world configuration"""
        # Find the mod in the filesystem first
        mod_manifest = self._find_mod_manifest(uuid, pack_type)
        if not mod_manifest:
            return False
            
        config_file = os.path.join(self.world_path, f"world_{pack_type}_packs.json")
        
        try:
            # Read existing configuration
            data = []
            if os.path.exists(config_file):
                with open(config_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:
                        data = loads(content)
                        if not isinstance(data, list):
                            data = []
            
            # Check if mod is already enabled
            if any(mod.get("pack_id") == str(uuid) for mod in data):
                return True  # Already enabled
                
            # Add mod to configuration
            mod_entry = {
                "pack_id": str(uuid),
                "version": mod_manifest["header"]["version"]
            }
            
            data.append(mod_entry)
            
            # Write updated configuration
            with open(config_file, 'w', encoding='utf-8') as f:
                dump(data, f, indent=2)
                
            print(f"Enabled mod {uuid} in {config_file}")
            return True
            
        except Exception as e:
            print(f"Error enabling mod: {e}")
            return False

    def disable_mod(self, uuid: UUID, pack_type: str) -> bool:
        """Disable a mod by removing it from world configuration (but keeping files)"""
        config_file = os.path.join(self.world_path, f"world_{pack_type}_packs.json")
        
        try:
            if not os.path.exists(config_file):
                return True  # Already disabled
                
            with open(config_file, 'r', encoding='utf-8') as f:
                data = load(f)
                
            # Filter out the mod
            original_length = len(data)
            data = [mod for mod in data if mod.get("pack_id") != str(uuid)]
            
            if len(data) == original_length:
                return True  # Mod wasn't enabled
                
            with open(config_file, 'w', encoding='utf-8') as f:
                dump(data, f, indent=2)
                
            print(f"Disabled mod {uuid} from {config_file}")
            return True
            
        except Exception as e:
            print(f"Error disabling mod: {e}")
            return False
            
    def _find_mod_manifest(self, uuid: UUID, pack_type: str) -> Optional[dict]:
        """Find manifest data for a specific mod"""
        mod_dir = self.behavior_dir if pack_type == "behavior" else self.resource_dir
        
        for subdir in os.listdir(mod_dir):
            manifest_path = os.path.join(mod_dir, subdir, "manifest.json")
            if os.path.exists(manifest_path):
                try:
                    with open(manifest_path, 'r', encoding='utf-8') as f:
                        data = load(f)
                        if data["header"]["uuid"] == str(uuid):
                            return data
                except Exception as e:
                    print(f"Error reading manifest {manifest_path}: {e}")
        return None

    def is_mod_enabled(self, uuid: UUID, pack_type: str) -> bool:
        """Check if a mod is currently enabled in world configuration"""
        config_file = os.path.join(self.world_path, f"world_{pack_type}_packs.json")
        
        if not os.path.exists(config_file):
            return False
            
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                data = load(f)
                return any(mod.get("pack_id") == str(uuid) for mod in data)
        except Exception:
            return False
            
    def get_mod_details(self, uuid: UUID) -> Optional[dict]:
        """Get detailed information about a mod"""
        # Check both behavior and resource directories
        for pack_type, mod_dir in [("behavior", self.behavior_dir), ("resource", self.resource_dir)]:
            for subdir in os.listdir(mod_dir):
                manifest_path = os.path.join(mod_dir, subdir, "manifest.json")
                if os.path.exists(manifest_path):
                    try:
                        with open(manifest_path, 'r', encoding='utf-8') as f:
                            data = load(f)
                            if data["header"]["uuid"] == str(uuid):
                                return {
                                    "uuid": str(uuid),
                                    "name": data["header"].get("name", "Unknown"),
                                    "description": data["header"].get("description", ""),
                                    "version": data["header"].get("version", [1, 0, 0]),
                                    "type": pack_type,
                                    "enabled": self.is_mod_enabled(uuid, pack_type),
                                    "file_path": os.path.join(mod_dir, subdir)
                                }
                    except Exception as e:
                        print(f"Error reading mod details: {e}")
        return None


if __name__ == "__main__":
    md = ModManager()
    BP, RP = md.list_all_active_mods()
    md.look_up(BP[0].pack_id)
