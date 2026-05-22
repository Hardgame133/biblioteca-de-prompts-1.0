# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Channel to use
  channel = "stable-23.11";

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
  ];

  # Sets environment variables in the workspace
  env = {};

  idx = {
    # Search for the extensions you want on https://open-vsx.org/
    extensions = [
      "ritwickdey.LiveServer"
    ];

    # Enable previews and configure the web preview to run http-server
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npx" "http-server" "-p" "$PORT" "-c-1"];
          manager = "web";
        };
      };
    };

    # Workspace lifecycle hooks
    onCreate = {
      # Open index.html by default
    };
    onStart = {
      # Any startup tasks
    };
  };
}
