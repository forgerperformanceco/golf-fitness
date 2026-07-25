# Adds the committed privacy manifest to Capacitor's generated Xcode project.
# Codemagic creates ios/ fresh, so this must run after `cap add/sync ios`.
require "fileutils"
require "xcodeproj"

root = File.expand_path("..", __dir__)
source = File.join(root, "native", "ios", "PrivacyInfo.xcprivacy")
project_path = File.join(root, "ios", "App", "App.xcodeproj")
destination = File.join(root, "ios", "App", "App", "PrivacyInfo.xcprivacy")

abort "Missing privacy manifest: #{source}" unless File.file?(source)
abort "Missing generated Xcode project: #{project_path}" unless Dir.exist?(project_path)

FileUtils.cp(source, destination)
project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |item| item.name == "App" } || abort("App target not found")
group = project.main_group.find_subpath("App", true)
reference = group.files.find { |item| item.path == "PrivacyInfo.xcprivacy" }
reference ||= group.new_file("PrivacyInfo.xcprivacy")

unless target.resources_build_phase.files_references.include?(reference)
  target.resources_build_phase.add_file_reference(reference, true)
end
project.save
puts "Installed PrivacyInfo.xcprivacy in the App target"
