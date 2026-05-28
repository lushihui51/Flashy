class TestSubjectsCRUD:
    def test_create_subject(self, client, subject_path):
        response = client.post(subject_path, json={"name": "Create Test Subject"})
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Create Test Subject"
        assert "id" in data

    def test_read_subject(self, client, subject_path, existing_subject):
        subject_id = existing_subject["id"]

        response = client.get(f"{subject_path}/{subject_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == subject_id
        assert data["name"] == "Test Subject"

    def test_update_subject(self, client, subject_path, existing_subject):
        subject_id = existing_subject["id"]

        response = client.patch(
            f"{subject_path}/{subject_id}", json={"name": "Updated Subject Name"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == subject_id
        assert data["name"] == "Updated Subject Name"

    def test_delete_subject(self, client, subject_path, existing_subject):
        subject_id = existing_subject["id"]

        response = client.delete(f"{subject_path}/{subject_id}")
        assert response.status_code == 204

        # Verify the subject is deleted
        get_response = client.get(f"{subject_path}/{subject_id}")
        assert get_response.status_code == 404
